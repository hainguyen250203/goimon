import type { PermissionKey } from "../domain/permission-definitions";
import { roleDrizzleRepository } from "./role.drizzle-repository";

const TTL_MS = 60_000;

type CacheEntry = { permissions: Set<PermissionKey>; expiresAt: number };

// Cache in-memory theo tên role — tránh query DB ở mỗi request có gọi
// permissionProcedure. Đủ dùng cho 1 instance Next.js server; invalidate
// toàn bộ (không theo từng key) mỗi khi có role bị sửa/xoá vì 1 role có thể
// ảnh hưởng nhiều user cùng lúc, không đáng để cache tinh vi hơn ở quy mô app
// này.
const cache = new Map<string, CacheEntry>();

export function invalidateRolePermissionCache(): void {
  cache.clear();
}

export async function getRolePermissions(roleName: string): Promise<Set<PermissionKey>> {
  const cached = cache.get(roleName);
  if (cached && cached.expiresAt > Date.now()) return cached.permissions;

  const role = await roleDrizzleRepository.findByName(roleName);
  const permissions = new Set(role?.permissions ?? []);
  cache.set(roleName, { permissions, expiresAt: Date.now() + TTL_MS });
  return permissions;
}
