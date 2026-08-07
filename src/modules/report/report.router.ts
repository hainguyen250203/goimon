import { z } from "zod";

import { permissionProcedure, createTRPCRouter } from "~/server/api/trpc";
import { assistantDrizzleRepository } from "~/modules/assistant/infrastructure/assistant.drizzle-repository";
import { orderDrizzleRepository } from "~/modules/order/infrastructure/order.drizzle-repository";
import { shiftDrizzleRepository } from "~/modules/shift/infrastructure/shift.drizzle-repository";
import { getDefaultReportRange } from "./application/get-default-report-range.usecase";
import { getReport } from "./application/get-report.usecase";

export const reportRouter = createTRPCRouter({
  getDefaultRange: permissionProcedure("bao-cao.get").query(() => getDefaultReportRange()),
  getReport: permissionProcedure("bao-cao.get")
    .input(
      z.object({
        start: z.coerce.date(),
        end: z.coerce.date(),
        categoryIds: z.array(z.number().int().positive()).optional(),
      }),
    )
    .query(({ input }) =>
      getReport(
        orderDrizzleRepository,
        shiftDrizzleRepository,
        assistantDrizzleRepository,
        input,
        input.categoryIds,
      ),
    ),
});
