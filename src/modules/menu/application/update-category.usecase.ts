import type {
  Category,
  MenuItemRepository,
  UpdateCategoryParams,
} from "../domain/menu-item.repository";

export async function updateCategory(
  repository: MenuItemRepository,
  params: UpdateCategoryParams,
): Promise<Category> {
  return repository.updateCategory(params);
}
