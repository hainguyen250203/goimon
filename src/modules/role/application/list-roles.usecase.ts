import type { Role } from "../domain/role.entity";
import type { RoleRepository } from "../domain/role.repository";

export function listRoles(repository: RoleRepository): Promise<Role[]> {
  return repository.list();
}
