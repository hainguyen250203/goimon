import type { Category, MenuItemRepository } from "../domain/menu-item.repository";

export async function listCategories(repository: MenuItemRepository): Promise<Category[]> {
  return repository.listCategoriesFull();
}
