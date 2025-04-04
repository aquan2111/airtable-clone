import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";

export const userRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  hallo: publicProcedure.query(({}) => {
    return {
      greeting: `Hallo`,
    };
  }),

  getAllUsers: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.user.findMany();
  }),

  getUserById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.user.findUnique({ where: { id: input.id } });
    }),

  createUser: protectedProcedure
    .input(z.object({ name: z.string().min(1), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.create({ data: input });
    }),

  updateUser: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.update({ where: { id: input.id }, data: input });
    }),

  deleteUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.delete({
        where: { id: input.id },
      });
    }),
});
