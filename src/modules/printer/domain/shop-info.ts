// Field name khớp thẳng với BillPrintPayload (shopName/shopAddress) để
// spread trực tiếp (`...SHOP_INFO`) lúc build payload ở order.router.ts.
/** Thông tin quán in cố định trên hoá đơn — hardcode theo quyết định v1, chưa có màn hình cài đặt riêng. */
export const SHOP_INFO = {
  shopName: "HỘ KINH DOANH BIA NHÀ ĐẬU LÝ THƯỜNG KIỆT",
  shopAddress: "308 Lý Thường Kiệt, Phường Diên Hồng, Quận 10, TPHCM",
};
