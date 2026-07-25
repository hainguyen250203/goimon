import type { SetUserRoleParams, UserRepository } from "../domain/user.repository";
import type { UserAccount } from "../domain/user-account.entity";

export async function setUserRole(
  repository: UserRepository,
  params: SetUserRoleParams,
): Promise<UserAccount> {
  return repository.setRole(params);
}
