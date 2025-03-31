import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";

export const viewRouter = createTRPCRouter({
  getViewsByTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.view.findMany({
        where: { tableId: input.tableId },
        select: {
          id: true,
          name: true,
          filters: true,
          sortOrder: true,
          hiddenCols: true,
        },
      });
    }),

  createView: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        tableId: z.string(),
        createdBy: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.view.create({
        data: {
          name: input.name,
          tableId: input.tableId,
          filters: {}, // Keeping empty object if no filters
          sortOrder: {}, // Keeping empty object for sort order
          hiddenCols: [], // Using empty array instead of empty object
          createdBy: input.createdBy,
        },
      });
    }),

  updateView: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        filters: z.record(z.object({
          type: z.enum([
            "contains",
            "not_contains", 
            "equals", 
            "is_empty", 
            "is_not_empty", 
            "greater_than", 
            "less_than",
            "notEquals",
            "greaterThan",
            "lessThan"
          ]),
          value: z.string().optional(),
        })).optional(),
        sortOrder: z.record(z.enum(["asc", "desc"])).optional(),
        hiddenCols: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.view.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.filters !== undefined && { filters: input.filters }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
          ...(input.hiddenCols !== undefined && {
            hiddenCols: input.hiddenCols,
          }),
        },
      });
    }),

  deleteView: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.view.delete({
        where: { id: input.id },
      });
    }),
});
