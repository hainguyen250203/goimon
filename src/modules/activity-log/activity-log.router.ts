import { z } from "zod";

import { createTRPCRouter, superadminProcedure } from "~/server/api/trpc";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "~/lib/pagination";
import { listActivities } from "./application/list-activities.usecase";
import { activityLogDrizzleRepository } from "./infrastructure/activity-log.drizzle-repository";

// superadminProcedure — nhật ký hoạt động phơi bày thao tác của MỌI người
// dùng trên toàn hệ thống (kể cả admin xoá order/thay đổi vai trò/mật khẩu),
// nên chỉ vai trò giám sát superadmin xem được — admin (người thực hiện thao
// tác) không tự xem lại được nữa (xem CLAUDE.md).
export const activityLogRouter = createTRPCRouter({
  list: superadminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        entityType: z.string().optional(),
      }),
    )
    .query(({ input }) => listActivities(activityLogDrizzleRepository, input)),
});
