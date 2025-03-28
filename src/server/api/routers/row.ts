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
      return await ctx.db.row.create({
        data: {
          tableId: input.tableId,
        },
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
