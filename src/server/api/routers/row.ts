import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";

export const rowRouter = createTRPCRouter({
  getAllRows: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.row.findMany({});
  }),

  getRowsByTable: protectedProcedure.input(z.object({ tableId: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.db.row.findMany({
      where: { tableId: input.tableId },
    });
  }),

  getRowById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.db.row.findUnique({ where: { id: input.id } });
  }),

  createRow: protectedProcedure
    .input(z.object({
      tableId: z.string(),      
    }))
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
});
