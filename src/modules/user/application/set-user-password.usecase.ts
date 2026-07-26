import type { SetUserPasswordParams, UserRepository } from "../domain/user.repository";

export async function setUserPassword(
  repository: UserRepository,
  params: SetUserPasswordParams,
): Promise<void> {
  return repository.setPassword(params);
}
