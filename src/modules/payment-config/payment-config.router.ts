import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { adminProcedure, managerProcedure, createTRPCRouter } from "~/server/api/trpc";
import { getPaymentConfig } from "./application/get-payment-config.usecase";
import { updatePaymentConfig } from "./application/update-payment-config.usecase";
import { paymentConfigDrizzleRepository } from "./infrastructure/payment-config.drizzle-repository";
import { listVietQrBanks } from "./infrastructure/vietqr-bank.client";
import { logActivity } from "~/modules/activity-log/log-activity";

const paymentConfigInputSchema = z.object({
  bankCode: z.string().min(1, "Vui lòng nhập mã ngân hàng"),
  bankAccountNumber: z.string().min(1, "Số tài khoản không được để trống"),
  bankAccountName: z.string().min(1, "Tên chủ tài khoản không được để trống"),
});

export const paymentConfigRouter = createTRPCRouter({
  // managerProcedure: quản lý xem được (vd để đối chiếu lúc thu ngân), chỉ
  // admin mới được sửa — chặn ở `update` bằng adminProcedure.
  get: managerProcedure.query(() => getPaymentConfig(paymentConfigDrizzleRepository)),

  // Danh sách ngân hàng để đổ vào select — gọi API công khai của VietQR
  // (không phải tích hợp thanh toán), cache dài ở client vì gần như không đổi.
  listBanks: managerProcedure.query(async () => {
    try {
      return await listVietQrBanks();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Không tải được danh sách ngân hàng từ VietQR.",
        cause: error,
      });
    }
  }),

  update: adminProcedure
    .input(paymentConfigInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { before, after } = await updatePaymentConfig(paymentConfigDrizzleRepository, input);
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "payment-config",
        entityId: String(after.id),
        metadata: {
          before: before
            ? {
                bankCode: before.bankCode,
                bankAccountNumber: before.bankAccountNumber,
                bankAccountName: before.bankAccountName,
              }
            : null,
          after: {
            bankCode: after.bankCode,
            bankAccountNumber: after.bankAccountNumber,
            bankAccountName: after.bankAccountName,
          },
        },
      });
      return after;
    }),
});
