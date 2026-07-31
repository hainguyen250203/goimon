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

/** Entity đầy đủ của danh mục — khác CategoryOption (chỉ id+name, dropdown active-only). */
export type Category = {
  id: number;
  name: string;
  isActive: boolean;
};

export type CreateCategoryParams = {
  name: string;
  isActive: boolean;
};

export type UpdateCategoryParams = CreateCategoryParams & { id: number };

export type CreateMenuItemParams = {
  categoryId: number;
  name: string;
  price: number;
  isAvailable: boolean;
  isPublished: boolean;
  printToKitchen: boolean;
};

export type UpdateMenuItemParams = CreateMenuItemParams & { id: number };

export interface MenuItemRepository {
  list(params: ListMenuItemsParams): Promise<ListMenuItemsResult>;
  /** Chỉ id+name, chỉ danh mục active — cho filter dropdown/form chọn danh mục. */
  listCategoryOptions(): Promise<CategoryOption[]>;
  /** Toàn bộ món đang hiển thị (isPublished=true), không phân trang — cho
   * màn hình gọi món chọn món. Món hết hàng (isAvailable=false) vẫn trả về
   * để UI hiện mờ/disable "Hết món" thay vì ẩn hẳn. */
  listForOrdering(): Promise<MenuItem[]>;
  /** Tra cứu theo id — order module dùng để lấy tên/giá thật (không tin client) khi thêm món vào đơn. */
  findByIds(ids: number[]): Promise<MenuItem[]>;
  /** Dùng để lấy snapshot "before" khi ghi activity log lúc update — xem update-menu-item.usecase.ts. */
  findById(id: number): Promise<MenuItem>;
  create(params: CreateMenuItemParams): Promise<MenuItem>;
  update(params: UpdateMenuItemParams): Promise<MenuItem>;
  /** Xoá thật (hard delete). Throw nếu món đã từng nằm trong order_items
   * (foreign_key_violation) — gọi nơi dùng nên hướng dẫn ẩn (isPublished)
   * thay vì xoá trong trường hợp đó. */
  remove(id: number): Promise<void>;

  // --- Quản trị danh mục (Category) — dùng cho dialog "Quản lý danh mục" ở /quan-ly/mon-an ---
  /** Toàn bộ danh mục (kể cả đang ẩn) — cho dialog quản lý, khác listCategoryOptions (chỉ active). */
  listCategoriesFull(): Promise<Category[]>;
  /** Dùng để lấy snapshot "before" khi ghi activity log lúc updateCategory — xem update-category.usecase.ts. */
  findCategoryById(id: number): Promise<Category>;
  createCategory(params: CreateCategoryParams): Promise<Category>;
  updateCategory(params: UpdateCategoryParams): Promise<Category>;
  /** Xoá thật. Throw nếu còn món ăn thuộc danh mục này (foreign_key_violation). */
  removeCategory(id: number): Promise<void>;
}
