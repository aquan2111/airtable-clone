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
      }),
    )
    .query(async ({ ctx, input }) => {
      // Modified to first select rows in order by orderIndex
      let query = `
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
            ELSE c.value > $${paramIndex}
          END)`;
              params.push(comparisonValue);
              paramIndex++;
              break;

            case "LESS_THAN":
              condition += `
          CASE 
            WHEN col.type = 'NUMBER' THEN CAST(c.value AS NUMERIC) < CAST($${paramIndex} AS NUMERIC)
            ELSE c.value < $${paramIndex}
          END)`;
              params.push(comparisonValue);
              paramIndex++;
              break;

            case "GREATER_THAN_OR_EQUAL":
              condition += `
          CASE 
            WHEN col.type = 'NUMBER' THEN CAST(c.value AS NUMERIC) >= CAST($${paramIndex} AS NUMERIC)
            ELSE c.value >= $${paramIndex}
          END)`;
              params.push(comparisonValue);
              paramIndex++;
              break;

            case "LESS_THAN_OR_EQUAL":
              condition += `
          CASE 
            WHEN col.type = 'NUMBER' THEN CAST(c.value AS NUMERIC) <= CAST($${paramIndex} AS NUMERIC)
            ELSE c.value <= $${paramIndex}
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
          query += ` AND (${filterGroups.join(" OR ")})`;
        }
      }

      query += `
      )
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

      // Add sorting logic
      if (input.sortOrders && input.sortOrders.length > 0) {
        const sortClauses: string[] = [];

        for (const sortOrder of input.sortOrders) {
          // Join to specific sort cells with lateral join approach
          const sortIdx = paramIndex;
          params.push(sortOrder.columnId);
          paramIndex++;

          const direction = sortOrder.order === "DESC" ? "DESC" : "ASC";

          // Use a lateral join to get the correct sort values efficiently
          sortClauses.push(`
          (SELECT c.value FROM "Cell" c 
           WHERE c."rowId" = r.id AND c."columnId" = $${sortIdx}
           LIMIT 1)
          ${direction} NULLS LAST
        `);
        }

        if (sortClauses.length > 0) {
          query += ` ORDER BY ${sortClauses.join(", ")}`;
        }
      } else {
        // Default ordering by orderIndex when no other sort is specified
        query += ` ORDER BY r."orderIndex" ASC`;
      }

      try {
        // Execute the raw query with proper parameter binding
        const rows = await ctx.db.$queryRawUnsafe<
          Array<{ id: string; cells: Cell[] }>
        >(query, ...params);

        // Process results to ensure proper format
        return rows.map((row) => ({
          ...row,
          cells: Array.isArray(row.cells) ? row.cells : [],
        }));
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
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true }
      });
      
      const newOrderIndex = highestOrderRow ? highestOrderRow.orderIndex + 1 : 0;

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

  updateRow: protectedProcedure
    .input(z.object({ 
      id: z.string(), 
      tableId: z.string().optional(),
      orderIndex: z.number().optional() // Allow updating the order index
    }))
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
        select: { tableId: true, orderIndex: true }
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
          orderIndex: { gt: rowToDelete.orderIndex }
        },
        data: {
          orderIndex: { decrement: 1 }
        }
      });

      return { success: true };
    }),
});