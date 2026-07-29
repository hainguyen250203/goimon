import type { SetUserRoleParams, UserRepository } from "../domain/user.repository";
import type { UserAccount } from "../domain/user-account.entity";

export type SetUserRoleResult = {
  before: UserAccount;
  after: UserAccount;
};

export async function setUserRole(
  repository: UserRepository,
  params: SetUserRoleParams,
): Promise<SetUserRoleResult> {
  const before = await repository.getById({ userId: params.userId, headers: params.headers });
  const after = await repository.setRole(params);
  return { before, after };
}
