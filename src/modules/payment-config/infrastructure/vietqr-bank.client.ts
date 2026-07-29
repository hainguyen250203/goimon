export type VietQrBank = {
  code: string;
  name: string;
  shortName: string;
};

/**
 * Danh sách ngân hàng hỗ trợ VietQR — chỉ đọc, dùng để đổ vào select chọn
 * ngân hàng trong form thông tin nhận tiền. KHÔNG phải tích hợp cổng thanh
 * toán/API ngân hàng thật — không gọi API nào liên quan tới tiền/giao dịch,
 * chỉ lấy danh mục tên/mã ngân hàng công khai.
 */
export async function listVietQrBanks(): Promise<VietQrBank[]> {
  const res = await fetch("https://api.vietqr.io/v2/banks");
  if (!res.ok) {
    throw new Error(`VietQR API trả về lỗi ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: { code: string; name: string; shortName: string }[];
  };
  return (json.data ?? []).map((b) => ({
    code: b.code,
    name: b.name,
    shortName: b.shortName,
  }));
}
