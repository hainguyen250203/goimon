/**
 * URL ảnh QR VietQR — đúng format sẽ dùng khi in hoá đơn (xem
 * pos-be/src/printers/actions/render-bill-image.action.ts để tham khảo).
 * `amount` optional: trang cấu hình payment-config không gắn với 1 đơn cụ
 * thể nên không truyền; lúc in bill thật (order.router.ts) truyền số tiền
 * của đơn vào để QR tự điền sẵn số tiền cho khách.
 */
export function buildVietQrImageUrl(
  bankCode: string,
  accountNumber: string,
  accountName: string,
  amount?: number,
): string {
  const params = new URLSearchParams();
  if (accountName) params.set("accountName", accountName);
  if (amount) params.set("amount", String(amount));
  const query = params.toString();
  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNumber)}-qr_only.png${query ? `?${query}` : ""}`;
}
