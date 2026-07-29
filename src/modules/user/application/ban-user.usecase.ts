import type { BanUserParams, UserRepository } from "../domain/user.repository";
import type { UserAccount } from "../domain/user-account.entity";

export type BanUserResult = {
  before: UserAccount;
  after: UserAccount;
};

export async function banUser(
  repository: UserRepository,
  params: BanUserParams,
): Promise<BanUserResult> {
  const before = await repository.getById({ userId: params.userId, headers: params.headers });
  const after = await repository.ban(params);
  return { before, after };
}
