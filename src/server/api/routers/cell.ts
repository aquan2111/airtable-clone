import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const cellRouter = createTRPCRouter({
  getAllCells: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.cell.findMany({});
  }),

  getCellsByTable: protectedProcedure
  .input(z.object({ tableId: z.string() }))
  .query(async ({ ctx, input }) => {
    const rows = await ctx.db.row.findMany({
      where: { tableId: input.tableId },
      select: { id: true },
    });

    const rowIds = rows.map((r) => r.id);

    if (rowIds.length === 0) {
      return [];
    }

    return await ctx.db.cell.findMany({
      where: {
        rowId: { in: rowIds },
      },
      include: {
        row: true,
        column: true,
      },
    });
  }),

  getCellsByRow: protectedProcedure
    .input(z.object({ rowId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cell.findMany({
        where: { rowId: input.rowId },
      });
    }),

  getCellsByColumn: protectedProcedure
    .input(z.object({ columnId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cell.findMany({
        where: { columnId: input.columnId },
      });
    }),

  getCellById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cell.findUnique({ where: { id: input.id } });
    }),

  createCell: protectedProcedure
    .input(
      z.object({
        rowId: z.string(),
        columnId: z.string(),
        value: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.cell.create({
        data: {
          rowId: input.rowId,
          columnId: input.columnId,
          value: input.value,
        },
      });
    }),

  updateCell: protectedProcedure
    .input(z.object({ id: z.string(), value: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the column type
      const cell = await ctx.db.cell.findUnique({
        where: { id: input.id },
        include: { column: true },
      });

      if (!cell) {
        throw new Error("Cell not found");
      }

      if (
        cell.column.type === "NUMBER" &&
        input.value !== "" &&
        isNaN(Number(input.value))
      ) {
        throw new Error(
          "Invalid input: This column only accepts numeric values.",
        );
      }

      return await ctx.db.cell.update({
        where: { id: input.id },
        data: input,
      });
    }),

  deleteCell: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.cell.delete({
        where: { id: input.id },
      });
    }),

  // ** Search Cells in a Specific Table**
  searchCellsInTable: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        query: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 1. Get active filters
      const activeFilters = await ctx.db.filter.findMany({
        where: {
          column: { tableId: input.tableId },
          isActive: true,
        },
        select: {
          columnId: true,
          comparisonFunction: true,
          comparisonValue: true,
        },
      });

      // 2. Get active sorts
      const activeSorts = await ctx.db.sortOrder.findMany({
        where: {
          column: { tableId: input.tableId },
          isActive: true,
        },
        select: {
          columnId: true,
          order: true,
        },
      });

      // 3. Get hidden columns
      const hiddenColumns = await ctx.db.hiddenColumn.findMany({
        where: {
          column: { tableId: input.tableId },
          isActive: true,
        },
        select: {
          columnId: true,
        },
      });
      const hiddenColumnIds = hiddenColumns.map((hc) => hc.columnId);

      // 4. Get visible columns in order
      const visibleColumns = await ctx.db.column.findMany({
        where: {
          tableId: input.tableId,
          id: { notIn: hiddenColumnIds },
        },
        orderBy: {
          orderIndex: "asc",
        },
      });

      // 5. Build and execute a raw SQL query similar to getRowsByTable, but focused on cells
      let query = `
      WITH matching_cells AS (
        SELECT c.id, c."rowId", c."columnId", c.value, col."orderIndex" as column_order
        FROM "Cell" c
        JOIN "Column" col ON c."columnId" = col.id
        JOIN "Row" r ON c."rowId" = r.id
        WHERE r."tableId" = $1
        AND c.value ILIKE $2
        AND c."columnId" NOT IN (${hiddenColumnIds.length > 0 ? hiddenColumnIds.map((_, i) => `$${i + 3}`).join(",") : "''"}))
    `;

      const params: unknown[] = [input.tableId, `%${input.query}%`];
      let paramIndex = 3;

      // Add hidden column IDs to params if any exist
      if (hiddenColumnIds.length > 0) {
        params.push(...hiddenColumnIds);
        paramIndex += hiddenColumnIds.length;
      }

      // Apply the same filtering logic as in getRowsByTable if filters exist
      if (activeFilters.length > 0) {
        query += `, filtered_rows AS (
        SELECT DISTINCT r.id
        FROM "Row" r
        JOIN "Cell" c ON r.id = c."rowId"
        JOIN "Column" col ON c."columnId" = col.id
        WHERE r."tableId" = $1
      `;

        const filterGroups: string[] = [];

        for (const filter of activeFilters) {
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

        query += `)
      SELECT mc.id, mc."rowId", mc."columnId", mc.column_order
      FROM matching_cells mc
      JOIN filtered_rows fr ON mc."rowId" = fr.id
      `;
      } else {
        // No filters, just use the matching cells
        query += `
      SELECT mc.id, mc."rowId", mc."columnId", mc.column_order
      FROM matching_cells mc
      `;
      }

      // Add sorting logic
      if (activeSorts.length > 0) {
        const sortClauses: string[] = [];

        for (const sortOrder of activeSorts) {
          // Join to specific sort cells with lateral join approach
          const sortIdx = paramIndex;
          params.push(sortOrder.columnId);
          paramIndex++;

          const direction = sortOrder.order === "DESC" ? "DESC" : "ASC";

          // Use a lateral join to get the correct sort values efficiently
          sortClauses.push(`
        (SELECT c.value FROM "Cell" c 
         WHERE c."rowId" = mc."rowId" AND c."columnId" = $${sortIdx}
         LIMIT 1)
        ${direction} NULLS LAST
      `);
        }

        if (sortClauses.length > 0) {
          query += ` ORDER BY mc.column_order ASC, ${sortClauses.join(", ")}`;
        }
      } else {
        // Default ordering: first by column order, then by row orderIndex
        query += `
      ORDER BY 
        mc.column_order ASC, 
        (SELECT r."orderIndex" FROM "Row" r WHERE r.id = mc."rowId") ASC
      `;
      }

      // Add limit
      query += ` LIMIT 100`;

      try {
        // Execute the raw query with proper parameter binding
        const results = await ctx.db.$queryRawUnsafe<
          {
            id: string;
            rowId: string;
            columnId: string;
            column_order: number;
          }[]
        >(query, ...params);

        // Return the results in the format you need
        return results.map((cell) => ({
          id: cell.id,
          rowId: cell.rowId,
          columnId: cell.columnId,
        }));
      } catch (error) {
        console.error("Database query error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to execute database query",
        });
      }
    }),
});
