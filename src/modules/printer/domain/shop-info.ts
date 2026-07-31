// Field name khớp thẳng với BillPrintPayload (shopName/shopAddress/...) để
// spread trực tiếp (`...SHOP_INFO`) lúc build payload ở order.router.ts.
/** Thông tin quán in cố định trên hoá đơn — hardcode theo quyết định v1, chưa có màn hình cài đặt riêng. */
export const SHOP_INFO = {
  shopName: "BẾP NHÀ ĐẬU",
  shopAddress: "308 Lý Thường Kiệt, Phường 14, Quận 10",
  // Tự chia sẵn 2 dòng cân đối — để renderer tự wrapText theo bề rộng canvas
  // dễ tách rơi 1 chữ lẻ xuống dòng riêng (từng xảy ra: "...(Mr" / "Khánh)").
  contactNote: ["▪ Trong quá trình sử dụng dịch vụ, quý khách có góp ý", "vui lòng liên hệ: 0777737605 (Mr Khánh)"],
  footerNote: "Cảm ơn Quý Khách",
};
