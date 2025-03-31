import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";

export const rowRouter = createTRPCRouter({
  getAllRows: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.row.findMany({});
  }),

  getRowsByTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.row.findMany({
        where: { tableId: input.tableId },
        include: { cells: true }, // Fetch row cells
      });
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
      const newRow = await ctx.db.row.create({
        data: {
          tableId: input.tableId,
        },
      });

      const columns = await ctx.db.column.findMany({
        where: { tableId: input.tableId },
      });

      if (columns.length > 0) {
        await ctx.db.cell.createMany({
          data: columns.map(column => ({
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
    .input(z.object({ id: z.string(), tableId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.row.update({
        where: { id: input.id },
        data: input,
      });
    }),

    deleteRow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete associated cells first
      await ctx.db.cell.deleteMany({ where: { rowId: input.id } });

      return await ctx.db.row.delete({ where: { id: input.id } });
    }),
});
