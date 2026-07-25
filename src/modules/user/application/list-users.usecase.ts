import type {
  ListUsersParams,
  ListUsersResult,
  UserRepository,
} from "../domain/user.repository";

export async function listUsers(
  repository: UserRepository,
  params: ListUsersParams,
): Promise<ListUsersResult> {
  return repository.list(params);
}
