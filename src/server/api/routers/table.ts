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
      return await ctx.db.table.findUnique({
        where: { id: input.id },
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
          { name: "Name", type: "TEXT", tableId: table.id },
          { name: "Age", type: "NUMBER", tableId: table.id },
        ],
      });

      // Fetch created columns to map their IDs
      const createdColumns = await ctx.db.column.findMany({
        where: { tableId: table.id },
      });

      // Create 5 default rows with random data
      const rows = await ctx.db.row.createMany({
        data: Array.from({ length: 5 }).map(() => ({ tableId: table.id })),
      });

      // Fetch created rows
      const createdRows = await ctx.db.row.findMany({
        where: { tableId: table.id },
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

  getFilteredSortedRows: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        search: z.string().optional(),
        filters: z
          .record(
            z.object({
              type: z.enum([
                "contains",
                "not_contains",
                "equals",
                "is_empty",
                "is_not_empty",
                "greater_than",
                "less_than",
              ]),
              value: z.string().optional(),
            }),
          )
          .optional(),
        sortOrder: z.record(z.enum(["asc", "desc"])).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, search, filters, sortOrder } = input;

      // Fetch all rows, but filter and sort at the database level where possible
      return await ctx.db.row
        .findMany({
          where: {
            tableId,
            AND: [
              search
                ? {
                    cells: {
                      some: {
                        value: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    },
                  }
                : {},
              filters
                ? {
                    cells: {
                      some: {
                        OR: Object.entries(filters).map(
                          ([columnId, filter]) => {
                            if (!filter.value) return {};
                            switch (filter.type) {
                              case "contains":
                                return {
                                  columnId,
                                  value: {
                                    contains: filter.value,
                                    mode: "insensitive",
                                  },
                                };
                              case "not_contains":
                                return {
                                  columnId,
                                  value: {
                                    not: {
                                      contains: filter.value,
                                      mode: "insensitive",
                                    },
                                  },
                                };
                              case "equals":
                                return { columnId, value: filter.value };
                              case "is_empty":
                                return { columnId, value: "" };
                              case "is_not_empty":
                                return { columnId, NOT: { value: "" } };
                              case "greater_than":
                                return {
                                  columnId,
                                  value: { gt: filter.value },
                                };
                              case "less_than":
                                return {
                                  columnId,
                                  value: { lt: filter.value },
                                };
                              default:
                                return {};
                            }
                          },
                        ),
                      },
                    },
                  }
                : {},
            ],
          },
          include: {
            cells: true, // Ensure cells are included for sorting
          },
        })
        .then((rows) => {
          // Apply sorting in JavaScript (since Prisma can't sort by nested fields)
          if (sortOrder) {
            rows.sort((a, b) => {
              for (const [columnId, direction] of Object.entries(sortOrder)) {
                const cellA =
                  a.cells.find((c) => c.columnId === columnId)?.value ?? "";
                const cellB =
                  b.cells.find((c) => c.columnId === columnId)?.value ?? "";

                if (!isNaN(Number(cellA)) && !isNaN(Number(cellB))) {
                  return direction === "asc"
                    ? Number(cellA) - Number(cellB)
                    : Number(cellB) - Number(cellA);
                } else {
                  return direction === "asc"
                    ? cellA.localeCompare(cellB)
                    : cellB.localeCompare(cellA);
                }
              }
              return 0;
            });
          }
          return rows;
        });
    }),
});
