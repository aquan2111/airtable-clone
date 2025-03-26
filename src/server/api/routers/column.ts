import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";

export const columnRouter = createTRPCRouter({
  getAllColumns: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.column.findMany({});
  }),

  getColumnsByTable: protectedProcedure.input(z.object({ tableId: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.db.column.findMany({
      where: { tableId: input.tableId },
    });
  }),

  getColumnById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return await ctx.db.column.findUnique({ where: { id: input } });
  }),

  createColumn: protectedProcedure
    .input(z.object({
      name: z.string().min(1),   
      type: z.string().min(1),   
      tableId: z.string(),       
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.column.create({
        data: {
          name: input.name,       
          type: input.type,       
          tableId: input.tableId, 
        },
      });
    }),

  updateColumn: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), type: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.column.update({
        where: { id: input.id },
        data: input,
      });
    }),
});
