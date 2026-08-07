import type { PermissionKey } from "./permission-definitions";
import type { Role } from "./role.entity";

export type CreateRoleParams = {
  name: string;
  description: string | null;
  permissions: PermissionKey[];
};

export type UpdateRoleParams = CreateRoleParams & { id: number };

export interface RoleRepository {
  list(): Promise<Role[]>;
  findById(id: number): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(params: CreateRoleParams): Promise<Role>;
  update(params: UpdateRoleParams): Promise<Role>;
  remove(id: number): Promise<void>;
  /** Số user đang gán role này (theo tên) — dùng để chặn xoá role còn dùng. */
  countUsersWithRoleName(name: string): Promise<number>;
}
