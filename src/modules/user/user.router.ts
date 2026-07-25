import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { listUsers } from "./application/list-users.usecase";
import { createUser } from "./application/create-user.usecase";
import { setUserRole } from "./application/set-user-role.usecase";
import { banUser } from "./application/ban-user.usecase";
import { unbanUser } from "./application/unban-user.usecase";
import { userBetterAuthRepository } from "./infrastructure/user.betterauth-repository";
import { logActivity } from "~/modules/activity-log/log-activity";

// Module này toàn bộ admin-only (quản lý tài khoản), không như menu/table
// dùng managerProcedure — xem adminProcedure trong ~/server/api/trpc.

const roleSchema = z.enum(["user", "manager", "admin"]);

// Login bằng số điện thoại nên validate lỏng định dạng di động VN, tránh
// nhập sai gây không đăng nhập được — không cần chuẩn hoá đầu số kỹ hơn.
const phoneNumberSchema = z
  .string()
  .regex(/^0\d{9}$/, "Số điện thoại không hợp lệ (vd: 0912345678)");

export const userRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        role: roleSchema.optional(),
        banned: z.boolean().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      listUsers(userBetterAuthRepository, { ...input, headers: ctx.headers }),
    ),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Tên không được để trống"),
        phoneNumber: phoneNumberSchema,
        password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let created;
      try {
        created = await createUser(userBetterAuthRepository, input);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            error instanceof Error
              ? error.message
              : "Tạo tài khoản thất bại.",
        });
      }
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "user",
        entityId: created.id,
        metadata: { name: created.name, role: created.role },
      });
      return created;
    }),

  setRole: adminProcedure
    .input(z.object({ userId: z.string().min(1), role: roleSchema }))
    .mutation(async ({ ctx, input }) => {
      const updated = await setUserRole(userBetterAuthRepository, {
        ...input,
        headers: ctx.headers,
      });
      await logActivity({
        actorId: ctx.session.user.id,
        action: "set_role",
        entityType: "user",
        entityId: updated.id,
        metadata: { role: updated.role },
      });
      return updated;
    }),

  ban: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        banReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await banUser(userBetterAuthRepository, {
        ...input,
        headers: ctx.headers,
      });
      await logActivity({
        actorId: ctx.session.user.id,
        action: "ban",
        entityType: "user",
        entityId: updated.id,
        metadata: input.banReason ? { banReason: input.banReason } : undefined,
      });
      return updated;
    }),

  unban: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const updated = await unbanUser(userBetterAuthRepository, {
        ...input,
        headers: ctx.headers,
      });
      await logActivity({
        actorId: ctx.session.user.id,
        action: "unban",
        entityType: "user",
        entityId: updated.id,
      });
      return updated;
    }),
});
