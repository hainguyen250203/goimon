import {
  createCallerFactory,
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { menuRouter } from "~/modules/menu/menu.router";
import { tableRouter } from "~/modules/table/table.router";
import { printerRouter } from "~/modules/printer/printer.router";
import { userRouter } from "~/modules/user/user.router";
import { orderRouter } from "~/modules/order/order.router";
import { promotionRouter } from "~/modules/promotion/promotion.router";
import { shiftRouter } from "~/modules/shift/shift.router";
import { paymentConfigRouter } from "~/modules/payment-config/payment-config.router";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ ok: true })),
  menu: menuRouter,
  table: tableRouter,
  printer: printerRouter,
  user: userRouter,
  order: orderRouter,
  promotion: promotionRouter,
  shift: shiftRouter,
  paymentConfig: paymentConfigRouter,
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
