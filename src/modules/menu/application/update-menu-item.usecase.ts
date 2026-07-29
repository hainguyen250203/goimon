import type {
  MenuItemRepository,
  UpdateMenuItemParams,
} from "../domain/menu-item.repository";
import type { MenuItem } from "../domain/menu-item.entity";

export type UpdateMenuItemResult = {
  before: MenuItem;
  after: MenuItem;
};

export async function updateMenuItem(
  repository: MenuItemRepository,
  params: UpdateMenuItemParams,
): Promise<UpdateMenuItemResult> {
  const before = await repository.findById(params.id);
  const after = await repository.update(params);
  return { before, after };
}
