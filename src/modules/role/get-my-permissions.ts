import { getSession } from "~/server/better-auth/server";
import type { PermissionKey } from "./domain/permission-definitions";
import { getRolePermissions } from "./infrastructure/role-permission-cache";

/** `keys` là mảng (không phải Set) — cần truyền được xuống Client Component
 * (vd AdminShell) qua props, Set không serialize được qua boundary RSC. */
export type ResolvedPermissions = { isSuper: boolean; keys: PermissionKey[] };

/** Resolve permission của người đang đăng nhập — dùng ở page guard/nav
 * filtering server-side. `isSuper` bypass, không cần đọc `keys`. */
export async function getMyPermissions(): Promise<ResolvedPermissions> {
  const session = await getSession();
  if (!session) return { isSuper: false, keys: [] };
  if (session.user.isSuper) return { isSuper: true, keys: [] };
  const permissions = await getRolePermissions(session.user.role ?? "user");
  return { isSuper: false, keys: Array.from(permissions) };
}

export function hasPermission(permissions: ResolvedPermissions, key: PermissionKey): boolean {
  return permissions.isSuper || permissions.keys.includes(key);
}
