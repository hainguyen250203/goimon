import type { BillPrintOutcome, BillPrinter } from "../domain/bill-printer";
import type { BillPrintPayload } from "../domain/bill-print-payload";
import type { PrinterRepository } from "../domain/printer.repository";

export async function printBillToPrinters(
  printerRepository: PrinterRepository,
  billPrinter: BillPrinter,
  payload: BillPrintPayload,
): Promise<BillPrintOutcome[]> {
  const printers = await printerRepository.listActiveByType("bill");
  if (printers.length === 0) return [];
  return billPrinter.print(payload, printers);
}
