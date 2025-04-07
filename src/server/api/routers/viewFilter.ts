import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const viewFilterRouter = createTRPCRouter({
  addFilterToView: protectedProcedure
    .input(z.object({ viewId: z.string(), filterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.viewFilter.create({
        data: {
          viewId: input.viewId,
          filterId: input.filterId,
        },
      });
    }),

  removeFilterFromView: protectedProcedure
    .input(z.object({ viewId: z.string(), filterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.viewFilter.delete({
        where: {
          viewId_filterId: {
            viewId: input.viewId,
            filterId: input.filterId,
          },
        },
      });
    }),

  getFiltersByView: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.viewFilter.findMany({
        where: { viewId: input.viewId},
        include: { filter: true},
      });
    }),
});
