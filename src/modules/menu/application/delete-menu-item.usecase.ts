import type { MenuItemRepository } from "../domain/menu-item.repository";

export async function deleteMenuItem(
  repository: MenuItemRepository,
  id: number,
): Promise<void> {
  return repository.remove(id);
}
