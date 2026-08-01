export type KitchenTicketLineItem = {
  itemName: string;
  quantity: number;
  note: string | null;
};

/**
 * DTO thuần cho 1 phiếu bếp — không có giá tiền (bếp không cần), khác hẳn
 * BillPrintPayload. `title` là tiêu đề in to ở đầu phiếu, phân biệt 4 loại:
 * "PHIẾU GỌI MÓN" | "PHIẾU HUỶ MÓN" | "PHIẾU CHUYỂN BÀN" | "PHIẾU CHUYỂN MÓN".
 */
export type KitchenTicketPayload = {
  title: string;
  orderId: number;
  /** Tên bàn đã tự gồm khu (vd "K1 - B5") — không cần thêm areaName riêng. */
  tableName: string;
  staffName: string;
  createdAt: Date;
  items: KitchenTicketLineItem[];
  /** vd "K1 - B5 -> K2 - B10" — chỉ có ở phiếu chuyển bàn/chuyển món. */
  transferInfo?: string;
  /** true CHỈ ở phiếu "PHIẾU HUỶ MÓN" — renderer gạch ngang tên món để bếp
   * nhận biết ngay đây là món bị trả/huỷ, không phải món cần chuẩn bị. */
  isRemoval?: boolean;
};
