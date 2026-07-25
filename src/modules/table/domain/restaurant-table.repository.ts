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

export type AreaOption = {
  id: number;
  name: string;
};

export type CreateTableParams = {
  name: string;
  areaId: number;
  status: TableStatus;
};

export type UpdateTableParams = CreateTableParams & { id: number };

export interface RestaurantTableRepository {
  list(params: ListTablesParams): Promise<ListTablesResult>;
  /** Chỉ id+name cho filter dropdown — không phải CRUD Area đầy đủ. */
  listAreaOptions(): Promise<AreaOption[]>;
  create(params: CreateTableParams): Promise<RestaurantTable>;
  update(params: UpdateTableParams): Promise<RestaurantTable>;
  /** Xoá thật (hard delete). Throw nếu bàn đã từng có order (foreign_key_violation). */
  remove(id: number): Promise<void>;
}
