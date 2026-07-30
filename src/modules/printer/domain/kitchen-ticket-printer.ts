import type { Printer } from "./printer.entity";
import type { KitchenTicketPayload } from "./kitchen-ticket-payload";
import type { PrintOutcome } from "./print-outcome";

/** Cùng nguyên tắc BillPrinter — không bao giờ throw, mọi lỗi gói vào PrintOutcome.error. */
export interface KitchenTicketPrinter {
  print(payload: KitchenTicketPayload, printers: Printer[]): Promise<PrintOutcome[]>;
}
