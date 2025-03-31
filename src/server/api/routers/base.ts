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

  getBaseById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.base.findUnique({ where: { id: input.id } });
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

  deleteBase: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. First, get all table IDs that belong to this base
      const tables = await ctx.db.table.findMany({
        where: { baseId: input.id },
        select: { id: true },
      });

      const tableIds = tables.map((table) => table.id);

      if (tableIds.length > 0) {
        await ctx.db.cell.deleteMany({
          where: { row: { tableId: { in: tableIds } } },
        });

        await ctx.db.row.deleteMany({
          where: { tableId: { in: tableIds } },
        });

        await ctx.db.column.deleteMany({
          where: { tableId: { in: tableIds } },
        });
      }

      await ctx.db.table.deleteMany({
        where: { baseId: input.id },
      });

      return await ctx.db.base.delete({
        where: { id: input.id },
      });
    }),
});
