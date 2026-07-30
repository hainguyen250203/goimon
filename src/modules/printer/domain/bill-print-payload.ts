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
  shopPhone: string;
  footerNote: string;
  orderId: number;
  /** Tên bàn đã tự gồm khu (vd "K1 - B5") — không cần thêm areaName riêng. */
  tableName: string;
  staffName: string;
  createdAt: Date;
  items: BillPrintLineItem[];
  subtotal: number;
  discountAmount: number;
  /** vd "Khuyến mãi mùa hè (-10%)" — null nếu đơn không áp dụng khuyến mãi. */
  discountLabel: string | null;
  totalAmount: number;
  /** null nếu chưa cấu hình payment-config (không có bank/QR để hiện). */
  qrImageUrl: string | null;
};
