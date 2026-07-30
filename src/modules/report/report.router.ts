import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { orderDrizzleRepository } from "~/modules/order/infrastructure/order.drizzle-repository";
import { shiftDrizzleRepository } from "~/modules/shift/infrastructure/shift.drizzle-repository";
import { getDefaultReportRange } from "./application/get-default-report-range.usecase";
import { getReport } from "./application/get-report.usecase";

export const reportRouter = createTRPCRouter({
  getDefaultRange: adminProcedure.query(() => getDefaultReportRange()),
  getReport: adminProcedure
    .input(
      z.object({
        start: z.coerce.date(),
        end: z.coerce.date(),
        categoryIds: z.array(z.number().int().positive()).optional(),
      }),
    )
    .query(({ input }) =>
      getReport(orderDrizzleRepository, shiftDrizzleRepository, input, input.categoryIds),
    ),
});
