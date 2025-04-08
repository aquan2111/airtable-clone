import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { ColumnType } from "@prisma/client";

export const columnRouter = createTRPCRouter({
  getAllColumns: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.column.findMany({
      orderBy: { orderIndex: 'asc' }
    });
  }),

  getColumnsByTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { orderIndex: 'asc' }
      });
    }),

  getColumnById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.column.findUnique({ where: { id: input.id } });
    }),

  createColumn: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.nativeEnum(ColumnType),
        tableId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the highest orderIndex in the table
      const highestOrderColumn = await ctx.db.column.findFirst({
        where: { tableId: input.tableId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true }
      });
      
      const newOrderIndex = highestOrderColumn ? highestOrderColumn.orderIndex + 1 : 0;
      
      const newColumn = await ctx.db.column.create({
        data: {
          name: input.name,
          type: input.type,
          tableId: input.tableId,
          orderIndex: newOrderIndex, // Set the new order index
        },
      });

      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
      });

      if (rows.length > 0) {
        await ctx.db.cell.createMany({
          data: rows.map(row => ({
            rowId: row.id,
            columnId: newColumn.id,
            value: "", // Empty value
          })),
        });
      }

      return await ctx.db.column.findUnique({
        where: { id: newColumn.id },
        include: { cells: true },
      });
    }),

  updateColumn: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        type: z.nativeEnum(ColumnType).optional(),
        orderIndex: z.number().optional(), // Allow updating the order index
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // If type is being changed to NUMBER, verify all existing values are valid
      if (input.type === "NUMBER") {
        const existingColumn = await ctx.db.column.findUnique({
          where: { id: input.id },
          include: { cells: true },
        });

        if (existingColumn && existingColumn.type !== "NUMBER") {
          // Check all cells in this column
          const cells = await ctx.db.cell.findMany({
            where: { columnId: input.id },
          });

          // Verify all values are valid numbers or empty
          const hasInvalidValue = cells.some(cell => {
            return cell.value !== "" && isNaN(Number(cell.value));
          });

          if (hasInvalidValue) {
            throw new Error("Cannot convert to NUMBER type: Column contains non-numeric values");
          }
        }
      }

      return await ctx.db.column.update({
        where: { id: input.id },
        data: input,
      });
    }),

  deleteColumn: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the column to be deleted
      const columnToDelete = await ctx.db.column.findUnique({
        where: { id: input.id },
        select: { tableId: true, orderIndex: true }
      });

      if (!columnToDelete) {
        throw new Error("Column not found");
      }

      // Delete the column
      await ctx.db.column.delete({ where: { id: input.id } });

      // Update the orderIndex of all columns with a higher orderIndex
      await ctx.db.column.updateMany({
        where: {
          tableId: columnToDelete.tableId,
          orderIndex: { gt: columnToDelete.orderIndex }
        },
        data: {
          orderIndex: { decrement: 1 }
        }
      });

      return { success: true };
    }),
});