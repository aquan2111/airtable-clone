import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";

export const columnRouter = createTRPCRouter({
  getAllColumns: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.column.findMany({});
  }),

  getColumnsByTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.column.findMany({
        where: { tableId: input.tableId },
      });
    }),

  getColumnById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.column.findUnique({ where: { id: input.id } });
    }),

  createColumn: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        tableId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const newColumn = await ctx.db.column.create({
        data: {
          name: input.name,
          type: input.type,
          tableId: input.tableId,
        },
      });

      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
      });

      if (rows.length > 0) {
        await ctx.db.cell.createMany({
          data: rows.map(row => ({
            rowId: row.id,
            columnId: newColumn.id,
            value: "", // Empty value
          })),
        });
      }

      return await ctx.db.column.findUnique({
        where: { id: newColumn.id },
        include: { cells: true },
      });
    }),

  updateColumn: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        type: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // If type is being changed to NUMBER, verify all existing values are valid
      if (input.type === "NUMBER") {
        const existingColumn = await ctx.db.column.findUnique({
          where: { id: input.id },
          include: { cells: true },
        });

        if (existingColumn && existingColumn.type !== "NUMBER") {
          // Check all cells in this column
          const cells = await ctx.db.cell.findMany({
            where: { columnId: input.id },
          });

          // Verify all values are valid numbers or empty
          const hasInvalidValue = cells.some(cell => {
            return cell.value !== "" && isNaN(Number(cell.value));
          });

          if (hasInvalidValue) {
            throw new Error("Cannot convert to NUMBER type: Column contains non-numeric values");
          }
        }
      }

      return await ctx.db.column.update({
        where: { id: input.id },
        data: input,
      });
    }),

  deleteColumn: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete associated cells first
      await ctx.db.cell.deleteMany({ where: { columnId: input.id } });

      return await ctx.db.column.delete({ where: { id: input.id } });
    }),
});