import type { RoleRepository } from "../domain/role.repository";

export type RoleOption = { id: number; name: string };

/** Danh sách rút gọn (chỉ id/name) cho select/filter ở trang KHÁC (vd dropdown
 * chọn vai trò ở trang Người dùng) — không lộ `permissions`, không cần quyền
 * "vai-tro.get" của trang Vai trò (xem role.router.ts's `listOptions`). */
export async function listRoleOptions(repository: RoleRepository): Promise<RoleOption[]> {
  const roles = await repository.list();
  return roles.map((r) => ({ id: r.id, name: r.name }));
}
