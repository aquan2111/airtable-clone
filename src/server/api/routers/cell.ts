import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";

export const cellRouter = createTRPCRouter({
  getAllCells: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.cell.findMany({});
  }),

  getCellsByRow: protectedProcedure.input(z.object({ rowId: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.db.cell.findMany({
      where: { rowId: input.rowId },
    });
  }),

  getCellsByColumn: protectedProcedure.input(z.object({ columnId: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.db.cell.findMany({
      where: { columnId: input.columnId },
    });
  }),

  getCellById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.db.cell.findUnique({ where: { id: input.id } });
  }),

  createCell: protectedProcedure
    .input(z.object({
      rowId: z.string(),         
      columnId: z.string(),      
      value: z.string().min(1),  
    }))
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
      return await ctx.db.cell.update({
        where: { id: input.id },
        data: input,
      });
    }),
});
