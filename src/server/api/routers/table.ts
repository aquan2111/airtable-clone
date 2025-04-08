import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { faker } from "@faker-js/faker";

export const tableRouter = createTRPCRouter({
  getAllTables: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.table.findMany({
      orderBy: { orderIndex: 'asc' }
    });
  }),

  getTablesByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.table.findMany({
        where: { baseId: input.baseId },
        orderBy: { orderIndex: 'asc' },
        include: {
          columns: {
            orderBy: { orderIndex: 'asc' }
          },
          rows: {
            orderBy: { orderIndex: 'asc' },
            include: {
              cells: true,
            },
          },
          views: true,
          activeView: true,
        },
      });
    }),

  getTableById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.table.findUnique({
        where: { id: input.id },
        include: {
          columns: {
            orderBy: { orderIndex: 'asc' }
          },
          rows: {
            orderBy: { orderIndex: 'asc' },
            include: {
              cells: true,
            },
          },
          views: true,
          activeView: true,
        },
      });
    }),

  createTable: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        baseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the highest orderIndex in the base
      const highestOrderTable = await ctx.db.table.findFirst({
        where: { baseId: input.baseId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true }
      });
      
      const newOrderIndex = highestOrderTable ? highestOrderTable.orderIndex + 1 : 0;
      
      const table = await ctx.db.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
          orderIndex: newOrderIndex, // Set the new order index
        },
      });

      // Create default columns with orderIndex
      await ctx.db.column.createMany({
        data: [
          { name: "Name", type: "TEXT", tableId: table.id, orderIndex: 0 },
          { name: "Age", type: "NUMBER", tableId: table.id, orderIndex: 1 },
        ],
      });

      // Fetch created columns to map their IDs
      const createdColumns = await ctx.db.column.findMany({
        where: { tableId: table.id },
        orderBy: { orderIndex: 'asc' }
      });

      // Create 5 default rows with random data and orderIndex
      await ctx.db.row.createMany({
        data: Array.from({ length: 5 }).map((_, index) => ({ 
          tableId: table.id,
          orderIndex: index
        })),
      });

      // Fetch created rows
      const createdRows = await ctx.db.row.findMany({
        where: { tableId: table.id },
        orderBy: { orderIndex: 'asc' }
      });

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

      // Create default view
      const defaultView = await ctx.db.view.create({
        data: {
          name: "Default View",
          isDefault: true,
          tableId: table.id,
        },
      });

      // Update the table to set the default view as active
      await ctx.db.table.update({
        where: { id: table.id },
        data: {
          activeViewId: defaultView.id,
        },
      });

      // Insert fake data into the cells
      await ctx.db.cell.createMany({ data: cellData });

      return {
        ...table,
        defaultView,
      };
    }),

  setActiveView: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        viewId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First verify the view exists and belongs to this table
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.viewId,
          tableId: input.tableId,
        },
      });

      if (!view) {
        throw new Error("View not found or does not belong to this table");
      }

      // Update the table with the new active view
      return await ctx.db.table.update({
        where: { id: input.tableId },
        data: { activeViewId: input.viewId },
        include: {
          activeView: true,
        },
      });
    }),

  updateTable: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        activeViewId: z.string().optional(),
        orderIndex: z.number().optional(), // Allow updating the order index
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.table.update({
        where: { id: input.id },
        data: input,
      });
    }),

  deleteTable: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get the table to be deleted
      const tableToDelete = await ctx.db.table.findUnique({
        where: { id: input.id },
        select: { baseId: true, orderIndex: true }
      });

      if (!tableToDelete) {
        throw new Error("Table not found");
      }

      // Delete the table
      await ctx.db.table.delete({
        where: { id: input.id },
      });

      // Update the orderIndex of all tables with a higher orderIndex
      await ctx.db.table.updateMany({
        where: {
          baseId: tableToDelete.baseId,
          orderIndex: { gt: tableToDelete.orderIndex }
        },
        data: {
          orderIndex: { decrement: 1 }
        }
      });

      return { success: true };
    }),
});