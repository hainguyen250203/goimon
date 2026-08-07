import type { RoleRepository } from "../domain/role.repository";

export async function deleteRole(repository: RoleRepository, id: number): Promise<void> {
  const role = await repository.findById(id);
  if (!role) throw new Error("Không tìm thấy vai trò.");

  const userCount = await repository.countUsersWithRoleName(role.name);
  if (userCount > 0) {
    throw new Error("Vai trò đang được gán cho người dùng, không thể xoá.");
  }

  await repository.remove(id);
}
