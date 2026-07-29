import type {
  Category,
  MenuItemRepository,
  UpdateCategoryParams,
} from "../domain/menu-item.repository";

export type UpdateCategoryResult = {
  before: Category;
  after: Category;
};

export async function updateCategory(
  repository: MenuItemRepository,
  params: UpdateCategoryParams,
): Promise<UpdateCategoryResult> {
  const before = await repository.findCategoryById(params.id);
  const after = await repository.updateCategory(params);
  return { before, after };
}
