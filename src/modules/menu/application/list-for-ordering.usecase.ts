import type { MenuItem } from "../domain/menu-item.entity";
import type { MenuItemRepository } from "../domain/menu-item.repository";

export async function listForOrdering(
  repository: MenuItemRepository,
): Promise<MenuItem[]> {
  return repository.listForOrdering();
}
