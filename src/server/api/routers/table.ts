import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { faker } from "@faker-js/faker";

export const tableRouter = createTRPCRouter({
  getAllTables: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.table.findMany({});
  }),

  getTablesByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.table.findMany({
        where: { baseId: input.baseId },
        include: {
          columns: true,
          rows: {
            include: {
              cells: true, 
            },
          },
        },
      });
    }),

  getTableById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.table.findUnique({ where: { id: input.id } });
    }),

    createTable: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        baseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const table = await ctx.db.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
        },
      });

      // Create default columns
      const columns = await ctx.db.column.createMany({
        data: [
          { name: "Name", type: "Text", tableId: table.id },
          { name: "Age", type: "Number", tableId: table.id },
        ],
      });

      // Fetch created columns to map their IDs
      const createdColumns = await ctx.db.column.findMany({ where: { tableId: table.id } });

      // Create 5 default rows with random data
      const rows = await ctx.db.row.createMany({
        data: Array.from({ length: 5 }).map(() => ({ tableId: table.id })),
      });

      // Fetch created rows
      const createdRows = await ctx.db.row.findMany({ where: { tableId: table.id } });

      // Generate fake data for each row and column
      const cellData = [];
      for (const row of createdRows) {
        for (const column of createdColumns) {
          let fakeValue = "";
          if (column.name === "Name") {
            fakeValue = faker.person.fullName();
          } else if (column.name === "Age") {
            fakeValue = faker.number.int({ min: 18, max: 60 }).toString();
          } 

          cellData.push({
            rowId: row.id,
            columnId: column.id,
            value: fakeValue,
          });
        }
      }

      // Insert fake data into the cells
      await ctx.db.cell.createMany({ data: cellData });

      return table;
    }),

  updateTable: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.table.update({
        where: { id: input.id },
        data: input,
      });
    }),

    deleteTable: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete related rows, columns, and cells before deleting the table
      await ctx.db.cell.deleteMany({ where: { row: { tableId: input.id } } });
      await ctx.db.row.deleteMany({ where: { tableId: input.id } });
      await ctx.db.column.deleteMany({ where: { tableId: input.id } });

      return await ctx.db.table.delete({
        where: { id: input.id },
      });
    }),
});
