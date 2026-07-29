import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { listActivities } from "./application/list-activities.usecase";
import { activityLogDrizzleRepository } from "./infrastructure/activity-log.drizzle-repository";

// adminProcedure — nhật ký hoạt động phơi bày thao tác của MỌI người dùng
// trên toàn hệ thống (kể cả thay đổi vai trò/mật khẩu ở module user), nhạy
// cảm hơn các trang quản lý khác nên chỉ admin xem được, giống "Người dùng"/
// "Báo cáo" (xem nav-config.ts).
export const activityLogRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        entityType: z.string().optional(),
      }),
    )
    .query(({ input }) => listActivities(activityLogDrizzleRepository, input)),
});
