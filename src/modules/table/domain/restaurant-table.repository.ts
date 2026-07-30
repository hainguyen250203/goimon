import type { RestaurantTable, TableStatus } from "./restaurant-table.entity";

export type ListTablesParams = {
  page: number;
  pageSize: number;
  areaId?: number;
  status?: TableStatus;
};

export type ListTablesResult = {
  items: RestaurantTable[];
  total: number;
};

export type TableStatusCounts = {
  available: number;
  occupied: number;
  total: number;
};

export type AreaOption = {
  id: number;
  name: string;
};

/** Entity đầy đủ của khu vực — khác AreaOption (chỉ id+name, dropdown active-only). */
export type Area = {
  id: number;
  name: string;
  isActive: boolean;
};

export type CreateAreaParams = {
  name: string;
  isActive: boolean;
};

export type UpdateAreaParams = CreateAreaParams & { id: number };

export type CreateTableParams = {
  name: string;
  areaId: number;
  status: TableStatus;
};

export type UpdateTableParams = CreateTableParams & { id: number };

export interface RestaurantTableRepository {
  list(params: ListTablesParams): Promise<ListTablesResult>;
  /** Chỉ id+name, chỉ khu vực active — cho filter dropdown/form chọn khu vực. */
  listAreaOptions(): Promise<AreaOption[]>;
  /** Dùng để lấy snapshot "before" khi ghi activity log lúc update — xem update-table.usecase.ts. */
  findById(id: number): Promise<RestaurantTable>;
  create(params: CreateTableParams): Promise<RestaurantTable>;
  update(params: UpdateTableParams): Promise<RestaurantTable>;
  /** Xoá thật (hard delete). Throw nếu bàn đã từng có order (foreign_key_violation). */
  remove(id: number): Promise<void>;
  /** Đổi trạng thái bàn (available/occupied) — module order gọi khi mở/đóng order, không phải CRUD admin. */
  setStatus(id: number, status: TableStatus): Promise<void>;
  /** Toàn bộ bàn, mọi khu vực, không phân trang — cho màn hình chọn bàn gọi món
   * (order module tự ghép thêm thông tin order đang hoạt động, xem
   * list-tables-for-ordering.usecase.ts — tránh table module phải import
   * schema của order module, gây circular import giữa 2 module). */
  listAll(): Promise<RestaurantTable[]>;
  /** Số bàn theo từng trạng thái (đang phục vụ/trống) — cho trang Tổng quan. */
  countByStatus(): Promise<TableStatusCounts>;

  // --- Quản trị khu vực (Area) — dùng cho dialog "Quản lý khu vực" ở /quan-ly/ban ---
  /** Toàn bộ khu vực (kể cả đang ẩn) — cho dialog quản lý, khác listAreaOptions (chỉ active). */
  listAreasFull(): Promise<Area[]>;
  /** Dùng để lấy snapshot "before" khi ghi activity log lúc updateArea — xem update-area.usecase.ts. */
  findAreaById(id: number): Promise<Area>;
  createArea(params: CreateAreaParams): Promise<Area>;
  updateArea(params: UpdateAreaParams): Promise<Area>;
  /** Xoá thật. Throw nếu còn bàn thuộc khu vực này (foreign_key_violation). */
  removeArea(id: number): Promise<void>;
}
