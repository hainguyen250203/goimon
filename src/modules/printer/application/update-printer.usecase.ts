import type {
  PrinterRepository,
  UpdatePrinterParams,
} from "../domain/printer.repository";
import type { Printer } from "../domain/printer.entity";

export async function updatePrinter(
  repository: PrinterRepository,
  params: UpdatePrinterParams,
): Promise<Printer> {
  return repository.update(params);
}
