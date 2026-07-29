/**
 * URL ảnh QR VietQR — đúng format sẽ dùng khi in hoá đơn (xem
 * pos-be/src/printers/actions/render-bill-image.action.ts để tham khảo).
 * Không truyền `amount` ở đây vì trang cấu hình này không gắn với 1 đơn cụ
 * thể — lúc in bill thật sẽ thêm `amount` theo từng đơn vào URL này.
 */
export function buildVietQrImageUrl(
  bankCode: string,
  accountNumber: string,
  accountName: string,
): string {
  const params = new URLSearchParams();
  if (accountName) params.set("accountName", accountName);
  const query = params.toString();
  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNumber)}-qr_only.png${query ? `?${query}` : ""}`;
}
