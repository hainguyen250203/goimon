import { z } from "zod";

import { managerProcedure, createTRPCRouter } from "~/server/api/trpc";
import { listOrders } from "./application/list-orders.usecase";
import { orderDrizzleRepository } from "./infrastructure/order.drizzle-repository";

// Chỉ có `list` — trang Đơn hàng hiện tại chỉ hiển thị, không có action
// (tạo/sửa/in bill/thanh toán/huỷ), theo đúng yêu cầu hiện tại.
export const orderRouter = createTRPCRouter({
  list: managerProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: z.enum(["open", "printed", "paid", "cancelled"]).optional(),
      }),
    )
    .query(({ input }) => listOrders(orderDrizzleRepository, input)),
});
