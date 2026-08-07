import { z } from "zod";

import { createTRPCRouter, permissionProcedure } from "~/server/api/trpc";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "~/lib/pagination";
import { listActivities } from "./application/list-activities.usecase";
import { activityLogDrizzleRepository } from "./infrastructure/activity-log.drizzle-repository";

// "nhat-ky-hoat-dong.get" — nhật ký hoạt động phơi bày thao tác của MỌI
// người dùng trên toàn hệ thống (kể cả admin xoá order/thay đổi vai trò/mật
// khẩu), nên cấp key này nghĩa là role đó xem được TOÀN BỘ, không chỉ hoạt
// động của chính mình. Trước đây isSuper-only tuyệt đối, nay cấp được qua
// trang Vai trò theo yêu cầu — isSuper vẫn bypass như mọi trang khác.
export const activityLogRouter = createTRPCRouter({
  list: permissionProcedure("nhat-ky-hoat-dong.get")
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        entityType: z.string().optional(),
        actorId: z.string().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      }),
    )
    .query(({ input }) => listActivities(activityLogDrizzleRepository, input)),
});
