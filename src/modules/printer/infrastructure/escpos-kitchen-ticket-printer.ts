import type { Printer } from "../domain/printer.entity";
import type { KitchenTicketPrinter } from "../domain/kitchen-ticket-printer";
import type { KitchenTicketPayload } from "../domain/kitchen-ticket-payload";
import type { PrintOutcome } from "../domain/print-outcome";
import { renderKitchenTicketImage } from "./kitchen-ticket-image-renderer";
import { printImageToPrinters } from "./escpos-transport";

export const escposKitchenTicketPrinter: KitchenTicketPrinter = {
  async print(payload: KitchenTicketPayload, printers: Printer[]): Promise<PrintOutcome[]> {
    const imageBuffer = await renderKitchenTicketImage(payload);
    return printImageToPrinters(printers, imageBuffer);
  },
};
