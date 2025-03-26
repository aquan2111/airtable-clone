import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";

export const baseRouter = createTRPCRouter({
  getAllBases: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.base.findMany({});
  }),

  getBasesByUser: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.base.findMany({
      where: { userId: ctx.session.user.id },
    });
  }),

  getBaseById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return await ctx.db.base.findUnique({ where: { id: input } });
  }),

  createBase: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.base.create({
        data: { name: input.name, userId: ctx.session.user.id },
      });
    }),

  updateBase: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.base.update({ where: { id: input.id }, data: input });
    }),
});
