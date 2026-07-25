import type {
  CategoryOption,
  MenuItemRepository,
} from "../domain/menu-item.repository";

export async function listCategoryOptions(
  repository: MenuItemRepository,
): Promise<CategoryOption[]> {
  return repository.listCategoryOptions();
}
