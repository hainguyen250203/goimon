import type { Printer } from "../domain/printer.entity";
import type { BillPrinter } from "../domain/bill-printer";
import type { BillPrintPayload } from "../domain/bill-print-payload";
import type { PrintOutcome } from "../domain/print-outcome";
import { renderBillImage } from "./bill-image-renderer";
import { printImageToPrinters } from "./escpos-transport";

export const escposBillPrinter: BillPrinter = {
  async print(payload: BillPrintPayload, printers: Printer[]): Promise<PrintOutcome[]> {
    const imageBuffer = await renderBillImage(payload);
    return printImageToPrinters(printers, imageBuffer);
  },
};
