import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const viewSortRouter = createTRPCRouter({
  addSortToView: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        sortOrderId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.viewSort.create({
        data: {
          viewId: input.viewId,
          sortOrderId: input.sortOrderId,
        },
      });
    }),

  removeSortFromView: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        sortOrderId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.viewSort.delete({
        where: {
          viewId_sortOrderId: {
            viewId: input.viewId,
            sortOrderId: input.sortOrderId,
          },
        },
      });
    }),

  getSortsByView: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.viewSort.findMany({
        where: { viewId: input.viewId },
        include: { sortOrder: true },
      });
    }),
});
