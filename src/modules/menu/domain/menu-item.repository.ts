import type { MenuItem } from "./menu-item.entity";

export type ListMenuItemsParams = {
  page: number;
  pageSize: number;
  categoryId?: number;
};

export type ListMenuItemsResult = {
  items: MenuItem[];
  total: number;
};

export type CategoryOption = {
  id: number;
  name: string;
};

export type CreateMenuItemParams = {
  categoryId: number;
  name: string;
  price: number;
  isAvailable: boolean;
  isPublished: boolean;
};

export type UpdateMenuItemParams = CreateMenuItemParams & { id: number };

export interface MenuItemRepository {
  list(params: ListMenuItemsParams): Promise<ListMenuItemsResult>;
  /** Chỉ id+name cho filter dropdown — không phải CRUD Category đầy đủ. */
  listCategoryOptions(): Promise<CategoryOption[]>;
  create(params: CreateMenuItemParams): Promise<MenuItem>;
  update(params: UpdateMenuItemParams): Promise<MenuItem>;
  /** Xoá thật (hard delete). Throw nếu món đã từng nằm trong order_items
   * (foreign_key_violation) — gọi nơi dùng nên hướng dẫn ẩn (isPublished)
   * thay vì xoá trong trường hợp đó. */
  remove(id: number): Promise<void>;
}
