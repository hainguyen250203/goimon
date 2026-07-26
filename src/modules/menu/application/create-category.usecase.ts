import type {
  Category,
  CreateCategoryParams,
  MenuItemRepository,
} from "../domain/menu-item.repository";

export async function createCategory(
  repository: MenuItemRepository,
  params: CreateCategoryParams,
): Promise<Category> {
  return repository.createCategory(params);
}
