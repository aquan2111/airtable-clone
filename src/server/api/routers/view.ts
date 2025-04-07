import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const viewRouter = createTRPCRouter({
  createView: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        tableId: z.string(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First create the view
      const view = await ctx.db.view.create({
        data: {
          name: input.name,
          tableId: input.tableId,
          isDefault: input.isDefault ?? false,
        },
      });

      // Always set this new view as the active view for the table
      await ctx.db.table.update({
        where: { id: input.tableId },
        data: { activeViewId: view.id },
      });

      // Return the created view
      return view;
    }),

  updateView: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.db.view.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
        },
      });
    }),

  getViewsForTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.view.findMany({
        where: { tableId: input.tableId },
        include: {
          filters: true,
          sorts: true,
          hidden: true,
        },
      });
    }),

  getViewById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.view.findUnique({
        where: { id: input.id },
        include: {
          filters: true,
          sorts: true,
          hidden: true,
        },
      });
    }),

  getViewsByTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.view.findMany({
        where: { tableId: input.tableId },
        include: {
          filters: true,
          sorts: true,
          hidden: true,
        },
      });
    }),

  deleteView: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const view = await ctx.db.view.findUnique({
        where: { id: input.id },
        include: { table: true },
      });

      if (!view) {
        throw new Error("Cannot find view");
      }

      if (view?.isDefault) {
        throw new Error("Cannot delete default view");
      }

      // If this is the active view for the table, set the default view as active
      if (view?.table.activeViewId === view.id) {
        // Find the default view
        const defaultView = await ctx.db.view.findFirst({
          where: {
            tableId: view.table.id,
            isDefault: true,
          },
        });

        if (defaultView) {
          await ctx.db.table.update({
            where: { id: view.table.id },
            data: { activeViewId: defaultView.id },
          });
        }
      }

      return ctx.db.view.delete({ where: { id: input.id } });
    }),
});
