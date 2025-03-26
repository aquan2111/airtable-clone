import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";

export const tableRouter = createTRPCRouter({
  getAllTables: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.table.findMany({});
  }),

  getTablesByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.table.findMany({
        where: { baseId: input.baseId },
      });
    }),

  getTableById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.table.findUnique({ where: { id: input.id } });
    }),

  createTable: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        baseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
        },
      });
    }),

  updateTable: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.table.update({
        where: { id: input.id },
        data: input,
      });
    }),

  deleteTable: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.table.delete({
        where: { id: input.id },
      });
    }),
});
