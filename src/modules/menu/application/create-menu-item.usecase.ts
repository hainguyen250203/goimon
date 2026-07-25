import type {
  CreateMenuItemParams,
  MenuItemRepository,
} from "../domain/menu-item.repository";
import type { MenuItem } from "../domain/menu-item.entity";

export async function createMenuItem(
  repository: MenuItemRepository,
  params: CreateMenuItemParams,
): Promise<MenuItem> {
  return repository.create(params);
}
