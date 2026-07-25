import type {
  ListMenuItemsParams,
  ListMenuItemsResult,
  MenuItemRepository,
} from "../domain/menu-item.repository";

export async function listMenuItems(
  repository: MenuItemRepository,
  params: ListMenuItemsParams,
): Promise<ListMenuItemsResult> {
  return repository.list(params);
}
