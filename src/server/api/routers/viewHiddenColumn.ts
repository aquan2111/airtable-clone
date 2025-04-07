import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const viewHiddenColumnRouter = createTRPCRouter({
  addHiddenColumnToView: protectedProcedure
    .input(z.object({
      viewId: z.string(),
      hiddenColumnId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.viewHiddenColumn.create({
        data: {
          viewId: input.viewId,
          hiddenColumnId: input.hiddenColumnId,
        },
      });
    }),

  removeHiddenColumnFromView: protectedProcedure
    .input(z.object({
      viewId: z.string(),
      hiddenColumnId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.viewHiddenColumn.delete({
        where: {
          viewId_hiddenColumnId: {
            viewId: input.viewId,
            hiddenColumnId: input.hiddenColumnId,
          },
        },
      });
    }),

  getHiddenColumnsByView: protectedProcedure
      .input(z.object({ viewId: z.string() }))
      .query(async ({ ctx, input }) => {
        return await ctx.db.viewHiddenColumn.findMany({
          where: { viewId: input.viewId},
          include: { hiddenColumn: true},
        });
      }),
});