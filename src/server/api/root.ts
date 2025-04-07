import { userRouter } from "~/server/api/routers/user";
import { baseRouter } from "~/server/api/routers/base";
import { tableRouter } from "~/server/api/routers/table";
import { columnRouter } from "~/server/api/routers/column";
import { rowRouter } from "~/server/api/routers/row";
import { cellRouter } from "~/server/api/routers/cell";
import { viewRouter } from "~/server/api/routers/view";
import { filterRouter } from "~/server/api/routers/filter";
import { sortOrderRouter } from "~/server/api/routers//sortOrder";
import { hiddenColumnRouter } from "~/server/api/routers/hiddenColumn";
import { viewFilterRouter } from "./routers/viewFilter";
import { viewSortRouter } from "./routers/viewSort";
import { viewHiddenColumnRouter } from "./routers/viewHiddenColumn";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  base: baseRouter,
  table: tableRouter,
  column: columnRouter,
  row: rowRouter,
  cell: cellRouter,
  view: viewRouter,
  filter: filterRouter,
  sortOrder: sortOrderRouter,
  hiddenColumn: hiddenColumnRouter,
  viewFilter: viewFilterRouter,
  viewSort: viewSortRouter,
  viewHiddenColumn: viewHiddenColumnRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
