/** Dùng chung cho mọi loại in (hoá đơn, phiếu bếp) — 1 máy in lỗi không được throw, phải gói vào đây. */
export type PrintOutcome = {
  printerId: number;
  printerName: string;
  ipAddress: string;
  success: boolean;
  error?: string;
};
