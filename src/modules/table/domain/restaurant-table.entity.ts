export type TableStatus = "available" | "occupied";

export type RestaurantTable = {
  id: number;
  name: string;
  areaId: number;
  areaName: string;
  status: TableStatus;
};

/** Bàn kèm order đang hoạt động (open/printed) — cho màn hình chọn bàn gọi món. */
export type TableForOrdering = RestaurantTable & {
  activeOrder: { id: number; subtotal: number; createdAt: Date } | null;
};
