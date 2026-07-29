// "cancelled": đơn thật sự mất — huỷ tay hoặc xoá hết món thủ công.
// "transferred": đơn tự đóng vì chuyển hết/gộp hết món sang bàn khác — không
// mất gì, doanh thu chỉ chuyển sang đơn khác. Tách riêng khỏi "cancelled" để
// báo cáo/thống kê không tính nhầm 2 việc khác bản chất làm 1.
export type OrderStatus = "open" | "paid" | "cancelled" | "transferred";
export type PaymentMethod = "cash" | "transfer";
