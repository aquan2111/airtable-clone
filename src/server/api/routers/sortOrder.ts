import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { SortDirection } from "@prisma/client";

export const sortOrderRouter = createTRPCRouter({
  createSortOrder: protectedProcedure
  .input(
    z.object({
      columnId: z.string(),
      order: z.nativeEnum(SortDirection),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // Step 1: Deactivate all existing sort orders for this column
    await ctx.db.sortOrder.updateMany({
      where: {
        columnId: input.columnId,
      },
      data: {
        isActive: false,
      },
    });

    // Step 2: Check if the requested sort order already exists
    const existing = await ctx.db.sortOrder.findUnique({
      where: {
        columnId_order: {
          columnId: input.columnId,
          order: input.order,
        },
      },
    });

    // Step 3: Reactivate or create the sort order
    if (existing) {
      return ctx.db.sortOrder.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }

    return ctx.db.sortOrder.create({
      data: {
        columnId: input.columnId,
        order: input.order,
        isActive: true,
      },
    });
  }),

  getAllSortsForTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.sortOrder.findMany({
        where: {
          column: { tableId: input.tableId },
        },
      });
    }),

  getAllActiveSortsForTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.sortOrder.findMany({
        where: {
          column: {
            tableId: input.tableId,
          },
          isActive: true,
        },
      });
    }),

  getSortById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.filter.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  updateSortOrder: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        order: z.nativeEnum(SortDirection).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.sortOrder.update({
        where: {
          id: input.id,
        },
        data: {
          order: input.order,
          isActive: input.isActive,
        },
      });
    }),

  deleteSortOrder: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.sortOrder.delete({ where: { id: input.id } });
    }),
});
