import type { Printer } from "./printer.entity";
import type { BillPrintPayload } from "./bill-print-payload";
import type { PrintOutcome } from "./print-outcome";

export type { PrintOutcome as BillPrintOutcome } from "./print-outcome";

/**
 * In hoá đơn KHÔNG được throw — 1 máy in lỗi (mất kết nối, hết giấy...)
 * không được chặn xác nhận thanh toán (xem print-bill-to-printers.usecase.ts
 * và order.router.ts). Mọi lỗi phải gói vào `PrintOutcome.error`.
 */
export interface BillPrinter {
  print(payload: BillPrintPayload, printers: Printer[]): Promise<PrintOutcome[]>;
}
