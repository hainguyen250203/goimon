import type { RoleRepository, UpdateRoleParams } from "../domain/role.repository";
import type { Role } from "../domain/role.entity";

export function updateRole(repository: RoleRepository, params: UpdateRoleParams): Promise<Role> {
  return repository.update(params);
}
