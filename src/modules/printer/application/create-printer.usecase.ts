import type {
  CreatePrinterParams,
  PrinterRepository,
} from "../domain/printer.repository";
import type { Printer } from "../domain/printer.entity";

export async function createPrinter(
  repository: PrinterRepository,
  params: CreatePrinterParams,
): Promise<Printer> {
  return repository.create(params);
}
