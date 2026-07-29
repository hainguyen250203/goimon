import type { UnbanUserParams, UserRepository } from "../domain/user.repository";
import type { UserAccount } from "../domain/user-account.entity";

export type UnbanUserResult = {
  before: UserAccount;
  after: UserAccount;
};

export async function unbanUser(
  repository: UserRepository,
  params: UnbanUserParams,
): Promise<UnbanUserResult> {
  const before = await repository.getById({ userId: params.userId, headers: params.headers });
  const after = await repository.unban(params);
  return { before, after };
}
