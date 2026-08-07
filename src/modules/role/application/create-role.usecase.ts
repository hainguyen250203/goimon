import type { CreateRoleParams, RoleRepository } from "../domain/role.repository";
import type { Role } from "../domain/role.entity";

export function createRole(repository: RoleRepository, params: CreateRoleParams): Promise<Role> {
  return repository.create(params);
}
