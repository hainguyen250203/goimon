import type { CreateUserParams, UserRepository } from "../domain/user.repository";
import type { UserAccount } from "../domain/user-account.entity";

export async function createUser(
  repository: UserRepository,
  params: CreateUserParams,
): Promise<UserAccount> {
  return repository.create(params);
}
