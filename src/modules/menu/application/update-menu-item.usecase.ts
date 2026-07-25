import type {
  MenuItemRepository,
  UpdateMenuItemParams,
} from "../domain/menu-item.repository";
import type { MenuItem } from "../domain/menu-item.entity";

export async function updateMenuItem(
  repository: MenuItemRepository,
  params: UpdateMenuItemParams,
): Promise<MenuItem> {
  return repository.update(params);
}
