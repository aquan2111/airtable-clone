import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ComparisonFunction } from "@prisma/client";

export const filterRouter = createTRPCRouter({
  createFilter: protectedProcedure
    .input(
      z.object({
        columnId: z.string(),
        comparisonFunction: z.nativeEnum(ComparisonFunction),
        comparisonValue: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.filter.findUnique({
        where: {
          columnId_comparisonFunction_comparisonValue: {
            columnId: input.columnId,
            comparisonFunction: input.comparisonFunction,
            comparisonValue: input.comparisonValue,
          },
        },
      });

      if (existing) {
        return ctx.db.filter.update({
          where: { id: existing.id },
          data: { isActive: true }, // or whatever "reactivation" means in your case
        });
      }

      return ctx.db.filter.create({
        data: {
          columnId: input.columnId,
          comparisonFunction: input.comparisonFunction,
          comparisonValue: input.comparisonValue ?? null,
        },
      });
    }),

  // Get all filters for a table (by finding filters tied to columns in that table)
  getAllFiltersForTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.filter.findMany({
        where: {
          column: {
            tableId: input.tableId,
          },
        },
      });
    }),

  getAllActiveFiltersForTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.filter.findMany({
        where: {
          column: {
            tableId: input.tableId,
          },
          isActive: true,
        },
      });
    }),

  // Get a single filter by ID
  getFilterById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.filter.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  // Update a filter
  updateFilter: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        comparisonFunction: z.nativeEnum(ComparisonFunction).optional(),
        comparisonValue: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.filter.update({
        where: {
          id: input.id,
        },
        data: {
          comparisonFunction: input.comparisonFunction,
          comparisonValue: input.comparisonValue,
          isActive: input.isActive,
        },
      });
    }),

  // Delete a filter
  deleteFilter: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.filter.delete({
        where: {
          id: input.id,
        },
      });
    }),
});
