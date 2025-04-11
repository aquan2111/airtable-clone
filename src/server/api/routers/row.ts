import type { Cell } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";

const validComparisonFunctions = [
  "EQUALS",
  "NOT_EQUALS",
  "GREATER_THAN",
  "LESS_THAN",
  "GREATER_THAN_OR_EQUAL",
  "LESS_THAN_OR_EQUAL",
  "CONTAINS",
  "NOT_CONTAINS",
  "IS_EMPTY",
  "IS_NOT_EMPTY",
] as const;

export const rowRouter = createTRPCRouter({
  getRowsByTable: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        filters: z
          .array(
            z.object({
              columnId: z.string(),
              comparisonFunction: z.enum(validComparisonFunctions),
              comparisonValue: z.string().optional(),
            }),
          )
          .optional(),
        sortOrders: z
          .array(
            z.object({
              columnId: z.string(),
              order: z.enum(["ASC", "DESC"]),
            }),
          )
          .optional(),
        offset: z.number().optional(),
        limit: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build the common CTE part including filters
      let commonCTE = `
WITH filtered_rows AS (
  SELECT DISTINCT r.id
  FROM "Row" r
  JOIN "Cell" c ON r.id = c."rowId"
  JOIN "Column" col ON c."columnId" = col.id
  WHERE r."tableId" = $1
`;

      const params: unknown[] = [input.tableId];
      let paramIndex = 2;

      // Add filter conditions
      if (input.filters && input.filters.length > 0) {
        const filterGroups: string[] = [];

        for (const filter of input.filters) {
          const { columnId, comparisonFunction, comparisonValue } = filter;

          let condition = `(c."columnId" = $${paramIndex} AND `;
          params.push(columnId);
          paramIndex++;

          switch (comparisonFunction) {
            case "EQUALS":
              condition += `c.value = $${paramIndex})`;
              params.push(comparisonValue);
              paramIndex++;
              break;

            case "NOT_EQUALS":
              condition += `c.value <> $${paramIndex})`;
              params.push(comparisonValue);
              paramIndex++;
              break;

            case "GREATER_THAN":
              condition += `
    CASE 
      WHEN col.type = 'NUMBER' THEN CAST(c.value AS NUMERIC) > CAST($${paramIndex} AS NUMERIC)
      ELSE c.value > CAST($${paramIndex} AS TEXT)
    END)`;
              params.push(comparisonValue);
              paramIndex++;
              break;

            case "LESS_THAN":
              condition += `
    CASE 
      WHEN col.type = 'NUMBER' THEN CAST(c.value AS NUMERIC) < CAST($${paramIndex} AS NUMERIC)
      ELSE c.value < CAST($${paramIndex} AS TEXT)
    END)`;
              params.push(comparisonValue);
              paramIndex++;
              break;

            case "GREATER_THAN_OR_EQUAL":
              condition += `
    CASE 
      WHEN col.type = 'NUMBER' THEN CAST(c.value AS NUMERIC) >= CAST($${paramIndex} AS NUMERIC)
      ELSE c.value >= CAST($${paramIndex} AS TEXT)
    END)`;
              params.push(comparisonValue);
              paramIndex++;
              break;

            case "LESS_THAN_OR_EQUAL":
              condition += `
    CASE 
      WHEN col.type = 'NUMBER' THEN CAST(c.value AS NUMERIC) <= CAST($${paramIndex} AS NUMERIC)
      ELSE c.value <= CAST($${paramIndex} AS TEXT)
    END)`;
              params.push(comparisonValue);
              paramIndex++;
              break;

            case "CONTAINS":
              condition += `c.value ILIKE $${paramIndex})`;
              params.push(`%${comparisonValue}%`);
              paramIndex++;
              break;

            case "NOT_CONTAINS":
              condition += `NOT (c.value ILIKE $${paramIndex}))`;
              params.push(`%${comparisonValue}%`);
              paramIndex++;
              break;

            case "IS_EMPTY":
              condition += `(c.value IS NULL OR c.value = ''))`;
              break;

            case "IS_NOT_EMPTY":
              condition += `(c.value IS NOT NULL AND c.value <> ''))`;
              break;

            default:
              throw new Error(
                `Unsupported comparison function: ${comparisonFunction as string}`,
              );
          }

          filterGroups.push(condition);
        }

        if (filterGroups.length > 0) {
          commonCTE += ` AND (${filterGroups.join(" OR ")})`;
        }
      }

      commonCTE += `)`;

      // Create both queries using the same CTE
      const countQuery = `${commonCTE} SELECT COUNT(*) as "totalCount" FROM filtered_rows;`;

      let query = `${commonCTE}
SELECT r.*, 
  COALESCE(
    json_agg(
      json_build_object(
        'id', c.id,
        'value', c.value,
        'columnId', c."columnId",
        'rowId', c."rowId",
        'column', json_build_object(
          'id', col.id,
          'name', col.name,
          'type', col.type
        )
      ) 
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::json
  ) as cells
FROM filtered_rows fr
JOIN "Row" r ON fr.id = r.id
LEFT JOIN "Cell" c ON r.id = c."rowId"
LEFT JOIN "Column" col ON c."columnId" = col.id
GROUP BY r.id
`;

      // Pre-fetch column types to decide whether to cast values during sorting
      const columnTypes = await ctx.db.column.findMany({
        where: {
          id: { in: input.sortOrders?.map((s) => s.columnId) ?? [] },
        },
        select: {
          id: true,
          type: true,
        },
      });

      if (input.sortOrders && input.sortOrders.length > 0) {
        const sortClauses: string[] = [];

        for (const sortOrder of input.sortOrders) {
          const sortIdx = paramIndex;
          params.push(sortOrder.columnId);
          paramIndex++;

          const direction = sortOrder.order === "DESC" ? "DESC" : "ASC";

          const columnType = columnTypes.find(
            (col) => col.id === sortOrder.columnId,
          )?.type;

          if (columnType === "NUMBER") {
            sortClauses.push(`
        (
          SELECT CAST(c.value AS NUMERIC)
          FROM "Cell" c
          WHERE c."rowId" = r.id AND c."columnId" = $${sortIdx}
          LIMIT 1
        ) ${direction} NULLS LAST
      `);
          } else {
            sortClauses.push(`
        (
          SELECT c.value
          FROM "Cell" c
          WHERE c."rowId" = r.id AND c."columnId" = $${sortIdx}
          LIMIT 1
        ) ${direction} NULLS LAST
      `);
          }
        }

        if (sortClauses.length > 0) {
          query += ` ORDER BY ${sortClauses.join(", ")}`;
        }
      } else {
        query += ` ORDER BY r."orderIndex" ASC`;
      }

      if (input.offset !== undefined && input.limit !== undefined) {
        query += ` OFFSET $${paramIndex} LIMIT $${paramIndex + 1}`;
        params.push(input.offset, input.limit);
        paramIndex += 2;
      }

      // Create a copy of params up to the point before any pagination params were added
      const countParams = params.slice(
        0,
        paramIndex - (input.offset !== undefined ? 2 : 0),
      );

      // Execute the count query. Adjust parameter binding as needed.
      const countResult = await ctx.db.$queryRawUnsafe<
        { totalCount: number }[]
      >(countQuery, ...countParams);
      const totalCount = countResult[0]?.totalCount ?? 0;

      console.log("Count Query:", countQuery);
      console.log("Main Query:", query);

      try {
        // Execute the raw query with proper parameter binding
        const rows = await ctx.db.$queryRawUnsafe<
          Array<{ id: string; cells: Cell[] }>
        >(query, ...params);

        const processedRows = rows.map((row) => ({
          ...row,
          cells: Array.isArray(row.cells) ? row.cells : [],
        }));

        return {
          totalCount,
          rows: processedRows,
        };
      } catch (error) {
        console.error("Database query error:", error);
        throw new Error("Failed to execute database query");
      }
    }),

  getRowById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.row.findUnique({ where: { id: input.id } });
    }),

  createRow: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the highest orderIndex in the table
      const highestOrderRow = await ctx.db.row.findFirst({
        where: { tableId: input.tableId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });

      const newOrderIndex = highestOrderRow
        ? highestOrderRow.orderIndex + 1
        : 0;

      const newRow = await ctx.db.row.create({
        data: {
          tableId: input.tableId,
          orderIndex: newOrderIndex, // Set the new order index
        },
      });

      const columns = await ctx.db.column.findMany({
        where: { tableId: input.tableId },
      });

      if (columns.length > 0) {
        await ctx.db.cell.createMany({
          data: columns.map((column) => ({
            rowId: newRow.id,
            columnId: column.id,
            value: "", // Empty value
          })),
        });
      }

      return await ctx.db.row.findUnique({
        where: { id: newRow.id },
        include: { cells: true },
      });
    }),

  createBulkRows: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        count: z.number().int().positive().max(100000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tableId, count } = input;

      // Get the highest orderIndex
      const highestOrderRow = await ctx.db.row.findFirst({
        where: { tableId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });

      const startOrderIndex = highestOrderRow
        ? highestOrderRow.orderIndex + 1
        : 0;

      // Get columns for this table
      const columns = await ctx.db.column.findMany({
        where: { tableId },
        select: { id: true, type: true },
      });

      // Generate rows in batches to avoid memory issues
      const batchSize = 1000;
      const totalBatches = Math.ceil(count / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchCount = Math.min(batchSize, count - batch * batchSize);
        const rowsToCreate = [];
        const cellsToCreate = [];

        for (let i = 0; i < batchCount; i++) {
          const rowId = crypto.randomUUID();
          rowsToCreate.push({
            id: rowId,
            tableId,
            orderIndex: startOrderIndex + batch * batchSize + i,
          });

          // Generate cells for each column
          for (const column of columns) {
            let value = "";
            if (column.type === "NUMBER") {
              value = Math.floor(Math.random() * 10000).toString();
            } else {
              value = `Data ${startOrderIndex + batch * batchSize + i}`;
            }

            cellsToCreate.push({
              rowId,
              columnId: column.id,
              value,
            });
          }
        }

        // Insert batch of rows and cells
        await ctx.db.$transaction([
          ctx.db.row.createMany({ data: rowsToCreate }),
          ctx.db.cell.createMany({ data: cellsToCreate }),
        ]);
      }

      return { success: true, rowsCreated: count };
    }),

  updateRow: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tableId: z.string().optional(),
        orderIndex: z.number().optional(), // Allow updating the order index
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.row.update({
        where: { id: input.id },
        data: input,
      });
    }),

  deleteRow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the row to be deleted
      const rowToDelete = await ctx.db.row.findUnique({
        where: { id: input.id },
        select: { tableId: true, orderIndex: true },
      });

      if (!rowToDelete) {
        throw new Error("Row not found");
      }

      // Delete the row
      await ctx.db.row.delete({ where: { id: input.id } });

      // Update the orderIndex of all rows with a higher orderIndex
      await ctx.db.row.updateMany({
        where: {
          tableId: rowToDelete.tableId,
          orderIndex: { gt: rowToDelete.orderIndex },
        },
        data: {
          orderIndex: { decrement: 1 },
        },
      });

      return { success: true };
    }),
});
