import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const hiddenColumnRouter = createTRPCRouter({
  createHiddenColumn: protectedProcedure
    .input(
      z.object({
        columnId: z.string(),
        tableId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if there's an existing hidden column for this columnId and tableId
      const existing = await ctx.db.hiddenColumn.findUnique({
        where: {
          columnId: input.columnId,
        },
      });

      // If it exists, reactivate it by setting isActive to true
      if (existing) {
        return ctx.db.hiddenColumn.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }

      // If no existing hidden column, create a new one
      return ctx.db.hiddenColumn.create({
        data: {
          columnId: input.columnId,
          isActive: true, // Set isActive to true upon creation
        },
      });
    }),

  getAllHiddenColumnsForTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.hiddenColumn.findMany({
        where: {
          column: { tableId: input.tableId },
        },
      });
    }),

  getAllActiveHiddenColumnsForTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.hiddenColumn.findMany({
        where: {
          column: {
            tableId: input.tableId,
          },
          isActive: true,
        },
      });
    }),

  getHiddenColumnById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.hiddenColumn.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  updateHiddenColumn: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.hiddenColumn.update({
        where: {
          id: input.id,
        },
        data: {
          isActive: input.isActive,
        },
      });
    }),

  deleteHiddenColumn: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.hiddenColumn.delete({ where: { id: input.id } });
    }),
});
