import type { KitchenTicketPayload } from "../domain/kitchen-ticket-payload";
import type { KitchenTicketPrinter } from "../domain/kitchen-ticket-printer";
import type { PrinterRepository } from "../domain/printer.repository";
import type { PrintOutcome } from "../domain/print-outcome";

export async function printKitchenTicket(
  printerRepository: PrinterRepository,
  kitchenTicketPrinter: KitchenTicketPrinter,
  payload: KitchenTicketPayload,
): Promise<PrintOutcome[]> {
  const printers = await printerRepository.listActiveByType("kitchen");
  if (printers.length === 0) return [];
  return kitchenTicketPrinter.print(payload, printers);
}
