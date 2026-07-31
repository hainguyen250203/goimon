import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { listUsers } from "./application/list-users.usecase";
import { createUser } from "./application/create-user.usecase";
import { setUserRole } from "./application/set-user-role.usecase";
import { setUserPassword } from "./application/set-user-password.usecase";
import { banUser } from "./application/ban-user.usecase";
import { unbanUser } from "./application/unban-user.usecase";
import { userBetterAuthRepository } from "./infrastructure/user.betterauth-repository";
import { logActivity } from "~/modules/activity-log/log-activity";

// Module này toàn bộ admin-only (quản lý tài khoản), không như menu/table
// dùng managerProcedure — xem adminProcedure trong ~/server/api/trpc.

const roleSchema = z.enum(["user", "manager", "admin", "superadmin"]);

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
    .query(({ ctx, input }) => {
      const isSuperadmin = ctx.session.user.role === "superadmin";
      // superadmin là vai trò giám sát ẨN — không cho non-superadmin biết nó
      // tồn tại. Lọc filter role="superadmin" thẳng ra kết quả rỗng (im lặng,
      // không FORBIDDEN — báo lỗi sẽ xác nhận ngược lại rằng vai trò này có
      // thật), và loại nó khỏi MỌI danh sách khác bất kể filter gì.
      if (!isSuperadmin && input.role === "superadmin") {
        return { items: [], total: 0 };
      }
      return listUsers(userBetterAuthRepository, {
        ...input,
        excludeSuperadmin: !isSuperadmin,
        headers: ctx.headers,
      });
    }),

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
      if (input.role === "superadmin" && ctx.session.user.role !== "superadmin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Chỉ superadmin mới có thể gán vai trò superadmin.",
        });
      }
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
      if (input.role === "superadmin" && ctx.session.user.role !== "superadmin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Chỉ superadmin mới có thể gán vai trò superadmin.",
        });
      }
      const { before, after } = await setUserRole(userBetterAuthRepository, {
        ...input,
        headers: ctx.headers,
      });
      await logActivity({
        actorId: ctx.session.user.id,
        action: "set_role",
        entityType: "user",
        entityId: after.id,
        metadata: { before: { role: before.role }, after: { role: after.role } },
      });
      return after;
    }),

  ban: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        banReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { before, after } = await banUser(userBetterAuthRepository, {
        ...input,
        headers: ctx.headers,
      });
      await logActivity({
        actorId: ctx.session.user.id,
        action: "ban",
        entityType: "user",
        entityId: after.id,
        metadata: {
          before: { banned: before.banned, banReason: before.banReason },
          after: { banned: after.banned, banReason: after.banReason },
        },
      });
      return after;
    }),

  unban: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { before, after } = await unbanUser(userBetterAuthRepository, {
        ...input,
        headers: ctx.headers,
      });
      await logActivity({
        actorId: ctx.session.user.id,
        action: "unban",
        entityType: "user",
        entityId: after.id,
        metadata: {
          before: { banned: before.banned, banReason: before.banReason },
          after: { banned: after.banned, banReason: after.banReason },
        },
      });
      return after;
    }),

  setPassword: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        newPassword: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await setUserPassword(userBetterAuthRepository, {
        ...input,
        headers: ctx.headers,
      });
      // Không log mật khẩu vào metadata activity log dù là mật khẩu mới.
      await logActivity({
        actorId: ctx.session.user.id,
        action: "set_password",
        entityType: "user",
        entityId: input.userId,
      });
    }),
});
