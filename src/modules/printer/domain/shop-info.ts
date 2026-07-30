// Field name khớp thẳng với BillPrintPayload (shopName/shopAddress/shopPhone)
// để spread trực tiếp (`...SHOP_INFO`) lúc build payload ở order.router.ts.
/** Thông tin quán in cố định trên hoá đơn — hardcode theo quyết định v1, chưa có màn hình cài đặt riêng. */
export const SHOP_INFO = {
  shopName: "BẾP NHÀ ĐẬU",
  shopAddress: "308 Lý Thường Kiệt, Phường 14, Quận 10",
  shopPhone: "0777737605 (Mr Khánh)",
  footerNote: "Cảm ơn Quý Khách",
};
