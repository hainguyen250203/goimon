import { createTRPCRouter, permissionProcedure } from "~/server/api/trpc";
import { orderDrizzleRepository } from "~/modules/order/infrastructure/order.drizzle-repository";
import { shiftDrizzleRepository } from "~/modules/shift/infrastructure/shift.drizzle-repository";
import { restaurantTableDrizzleRepository } from "~/modules/table/infrastructure/restaurant-table.drizzle-repository";
import { getDashboardOverview } from "./application/get-dashboard-overview.usecase";

export const dashboardRouter = createTRPCRouter({
  getOverview: permissionProcedure("dashboard.get").query(() =>
    getDashboardOverview(orderDrizzleRepository, shiftDrizzleRepository, restaurantTableDrizzleRepository),
  ),
});
