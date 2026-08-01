export type RestaurantTable = {
  id: number;
  name: string;
  areaId: number;
  areaName: string;
};

/** Bàn kèm order đang hoạt động (open/printed) — cho màn hình chọn bàn gọi món.
 * "Đang phục vụ hay trống" luôn suy trực tiếp từ `activeOrder !== null`, không
 * lưu thành field/cột riêng nào — tránh 2 nguồn sự thật dễ lệch nhau. */
export type TableForOrdering = RestaurantTable & {
  activeOrder: { id: number; subtotal: number; createdAt: Date } | null;
};
