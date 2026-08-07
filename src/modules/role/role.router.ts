import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { permissionProcedure, staffProcedure, createTRPCRouter } from "~/server/api/trpc";
import { logActivity } from "~/modules/activity-log/log-activity";
import { toSafeErrorMessage } from "~/lib/db-errors";
import { permissionDefinitions, type PermissionKey } from "./domain/permission-definitions";
import { listRoles } from "./application/list-roles.usecase";
import { listRoleOptions } from "./application/list-role-options.usecase";
import { createRole } from "./application/create-role.usecase";
import { updateRole } from "./application/update-role.usecase";
import { deleteRole } from "./application/delete-role.usecase";
import { roleDrizzleRepository } from "./infrastructure/role.drizzle-repository";
import { invalidateRolePermissionCache } from "./infrastructure/role-permission-cache";

const permissionKeySchema = z.enum(
  Object.keys(permissionDefinitions) as [PermissionKey, ...PermissionKey[]],
);

const roleInputSchema = z.object({
  name: z.string().min(1, "Tên vai trò không được để trống"),
  description: z.string().trim().min(1).nullable(),
  permissions: z.array(permissionKeySchema),
});

export const roleRouter = createTRPCRouter({
  list: permissionProcedure("vai-tro.get").query(() => listRoles(roleDrizzleRepository)),

  // Danh sách rút gọn (id/name) cho select/filter ở trang KHÁC (vd dropdown
  // chọn vai trò ở trang Người dùng) — cố tình KHÔNG đòi "vai-tro.get": chọn
  // vai trò cho user là việc của "nguoi-dung.gan-vai-tro", không phải việc
  // xem/quản lý trang Vai trò, nên staffProcedure (đăng nhập là đủ) như mọi
  // select/filter tham chiếu chéo module khác trong app (vd table.listAreas).
  listOptions: staffProcedure.query(() => listRoleOptions(roleDrizzleRepository)),

  create: permissionProcedure("vai-tro.tao")
    .input(roleInputSchema)
    .mutation(async ({ ctx, input }) => {
      let item;
      try {
        item = await createRole(roleDrizzleRepository, input);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: toSafeErrorMessage(
            error,
            "Tạo vai trò thất bại.",
            `Tên vai trò "${input.name}" đã tồn tại.`,
          ),
        });
      }
      invalidateRolePermissionCache();
      await logActivity({
        actorId: ctx.session.user.id,
        action: "create",
        entityType: "role",
        entityId: String(item.id),
        metadata: { name: item.name },
      });
      return item;
    }),

  update: permissionProcedure("vai-tro.sua")
    .input(roleInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      let item;
      try {
        item = await updateRole(roleDrizzleRepository, input);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: toSafeErrorMessage(
            error,
            "Cập nhật vai trò thất bại.",
            `Tên vai trò "${input.name}" đã tồn tại.`,
          ),
        });
      }
      invalidateRolePermissionCache();
      await logActivity({
        actorId: ctx.session.user.id,
        action: "update",
        entityType: "role",
        entityId: String(item.id),
        metadata: { name: item.name, permissions: item.permissions },
      });
      return item;
    }),

  delete: permissionProcedure("vai-tro.xoa")
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteRole(roleDrizzleRepository, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: toSafeErrorMessage(error, "Xoá thất bại."),
        });
      }
      invalidateRolePermissionCache();
      await logActivity({
        actorId: ctx.session.user.id,
        action: "delete",
        entityType: "role",
        entityId: String(input.id),
      });
    }),
});
