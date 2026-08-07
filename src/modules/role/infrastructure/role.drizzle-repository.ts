import { count, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { user } from "~/server/better-auth/schema";
import type { PermissionKey } from "../domain/permission-definitions";
import type { Role } from "../domain/role.entity";
import type {
  CreateRoleParams,
  RoleRepository,
  UpdateRoleParams,
} from "../domain/role.repository";
import { role } from "./role.schema";

function toEntity(row: typeof role.$inferSelect): Role {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: row.permissions as PermissionKey[],
  };
}

export const roleDrizzleRepository: RoleRepository = {
  async list(): Promise<Role[]> {
    const rows = await db.select().from(role).orderBy(role.name);
    return rows.map(toEntity);
  },

  async findById(id: number): Promise<Role | null> {
    const rows = await db.select().from(role).where(eq(role.id, id));
    const row = rows[0];
    return row ? toEntity(row) : null;
  },

  async findByName(name: string): Promise<Role | null> {
    const rows = await db.select().from(role).where(eq(role.name, name));
    const row = rows[0];
    return row ? toEntity(row) : null;
  },

  async create(params: CreateRoleParams): Promise<Role> {
    const [row] = await db.insert(role).values(params).returning();
    if (!row) throw new Error("Tạo vai trò thất bại.");
    return toEntity(row);
  },

  // `user.role` có FK thật trỏ về `role.name` (ON UPDATE CASCADE, xem
  // better-auth/schema.ts) — đổi tên role ở đây, Postgres tự cập nhật lại
  // mọi user đang gán tên cũ, không cần code tự cascade thủ công.
  async update({ id, ...params }: UpdateRoleParams): Promise<Role> {
    const [row] = await db.update(role).set(params).where(eq(role.id, id)).returning();
    if (!row) throw new Error("Không tìm thấy vai trò.");
    return toEntity(row);
  },

  async remove(id: number): Promise<void> {
    await db.delete(role).where(eq(role.id, id));
  },

  async countUsersWithRoleName(name: string): Promise<number> {
    const [row] = await db.select({ value: count() }).from(user).where(eq(user.role, name));
    return row?.value ?? 0;
  },
};
