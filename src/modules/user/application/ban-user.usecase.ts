import type { BanUserParams, UserRepository } from "../domain/user.repository";
import type { UserAccount } from "../domain/user-account.entity";

export async function banUser(
  repository: UserRepository,
  params: BanUserParams,
): Promise<UserAccount> {
  return repository.ban(params);
}
