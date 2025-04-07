import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";

export const cellRouter = createTRPCRouter({
  getAllCells: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.cell.findMany({});
  }),

  getCellsByRow: protectedProcedure
    .input(z.object({ rowId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cell.findMany({
        where: { rowId: input.rowId },
      });
    }),

  getCellsByColumn: protectedProcedure
    .input(z.object({ columnId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cell.findMany({
        where: { columnId: input.columnId },
      });
    }),

  getCellById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cell.findUnique({ where: { id: input.id } });
    }),

  createCell: protectedProcedure
    .input(
      z.object({
        rowId: z.string(),
        columnId: z.string(),
        value: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.cell.create({
        data: {
          rowId: input.rowId,
          columnId: input.columnId,
          value: input.value,
        },
      });
    }),

  updateCell: protectedProcedure
    .input(z.object({ id: z.string(), value: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the column type
      const cell = await ctx.db.cell.findUnique({
        where: { id: input.id },
        include: { column: true },
      });

      if (!cell) {
        throw new Error("Cell not found");
      }

      if (
        cell.column.type === "NUMBER" &&
        input.value !== "" &&
        isNaN(Number(input.value))
      ) {
        throw new Error(
          "Invalid input: This column only accepts numeric values.",
        );
      }

      return await ctx.db.cell.update({
        where: { id: input.id },
        data: input,
      });
    }),

  deleteCell: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.cell.delete({
        where: { id: input.id },
      });
    }),

  // ** Search Cells by Value (Global Search)**
  searchCells: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cell.findMany({
        where: {
          value: { contains: input.query, mode: "insensitive" }, // Case-insensitive search
        },
        take: 100, // Limit results
      });
    }),

  // ** Search Cells in a Specific Table**
  searchCellsInTable: protectedProcedure
    .input(z.object({ tableId: z.string(), query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cell.findMany({
        where: {
          row: { tableId: input.tableId }, // Ensure the row belongs to the table
          value: { contains: input.query, mode: "insensitive" },
        },
        take: 100,
      });
    }),
});
