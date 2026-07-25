import type { UnbanUserParams, UserRepository } from "../domain/user.repository";
import type { UserAccount } from "../domain/user-account.entity";

export async function unbanUser(
  repository: UserRepository,
  params: UnbanUserParams,
): Promise<UserAccount> {
  return repository.unban(params);
}
