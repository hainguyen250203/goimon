export type BillPrintLineItem = {
  itemName: string;
  unitPrice: number;
  quantity: number;
  note: string | null;
};

/** DTO thuần cho 1 lần in hoá đơn — build ở order.router.ts từ OrderDetail + table + shop info. */
export type BillPrintPayload = {
  shopName: string;
  shopAddress: string;
  orderId: number;
  /** Tên bàn đã tự gồm khu (vd "K1 - B5") — không cần thêm areaName riêng. */
  tableName: string;
  staffName: string;
  /** Giờ vào — thời điểm mở đơn/bàn. */
  createdAt: Date;
  /** Giờ ra — thời điểm in bill (luôn là "bây giờ", khác createdAt). */
  printedAt: Date;
  items: BillPrintLineItem[];
  subtotal: number;
  discountAmount: number;
  /** Chỉ hiện nhãn chung "Khuyến mãi" — null nếu đơn không áp dụng khuyến mãi. */
  discountLabel: string | null;
  totalAmount: number;
  /** null nếu chưa cấu hình payment-config (không có bank/QR để hiện). */
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  qrImageUrl: string | null;
};
