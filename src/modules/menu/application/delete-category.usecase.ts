import type { MenuItemRepository } from "../domain/menu-item.repository";

export async function deleteCategory(
  repository: MenuItemRepository,
  id: number,
): Promise<void> {
  return repository.removeCategory(id);
}
