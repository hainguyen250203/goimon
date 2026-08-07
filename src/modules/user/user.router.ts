import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { permissionProcedure, createTRPCRouter } from "~/server/api/trpc";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "~/lib/pagination";
import { listUsers } from "./application/list-users.usecase";
import { createUser } from "./application/create-user.usecase";
import { setUserRole } from "./application/set-user-role.usecase";
import { setUserPassword } from "./application/set-user-password.usecase";
import { banUser } from "./application/ban-user.usecase";
import { unbanUser } from "./application/unban-user.usecase";
import { userBetterAuthRepository } from "./infrastructure/user.betterauth-repository";
import { logActivity } from "~/modules/activity-log/log-activity";
import { roleDrizzleRepository } from "~/modules/role/infrastructure/role.drizzle-repository";

// roleSchema chỉ validate "có phải chuỗi không rỗng" — role thật là dữ liệu
// (bảng `role`, xem trang Vai trò), không còn union cố định. `assertRoleExists`
// verify tên role có tồn tại trước khi gán, tránh gõ tay 1 tên role không
// tồn tại (không phá gì nhưng user đó sẽ trắng quyền vô lý do không role nào
// khớp).
const roleSchema = z.string().min(1);

async function assertRoleExists(name: string) {
  const role = await roleDrizzleRepository.findByName(name);
  if (!role) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Vai trò "${name}" không tồn tại.` });
  }
}

// Login bằng số điện thoại nên validate lỏng định dạng di động VN, tránh
// nhập sai gây không đăng nhập được — không cần chuẩn hoá đầu số kỹ hơn.
const phoneNumberSchema = z
  .string()
  .regex(/^0\d{9}$/, "Số điện thoại không hợp lệ (vd: 0912345678)");

export const userRouter = createTRPCRouter({
  list: permissionProcedure("nguoi-dung.get")
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        role: roleSchema.optional(),
        banned: z.boolean().optional(),
      }),
    )
    .query(({ ctx, input }) => listUsers(userBetterAuthRepository, { ...input, headers: ctx.headers })),

  create: permissionProcedure("nguoi-dung.tao")
    .input(
      z.object({
        name: z.string().min(1, "Tên không được để trống"),
        phoneNumber: phoneNumberSchema,
        password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertRoleExists(input.role);
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

  setRole: permissionProcedure("nguoi-dung.gan-vai-tro")
    .input(z.object({ userId: z.string().min(1), role: roleSchema }))
    .mutation(async ({ ctx, input }) => {
      await assertRoleExists(input.role);
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

  ban: permissionProcedure("nguoi-dung.khoa-mo-khoa")
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

  unban: permissionProcedure("nguoi-dung.khoa-mo-khoa")
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

  setPassword: permissionProcedure("nguoi-dung.doi-mat-khau")
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
