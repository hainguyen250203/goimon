import type { PrinterRepository } from "../domain/printer.repository";

export async function deletePrinter(
  repository: PrinterRepository,
  id: number,
): Promise<void> {
  return repository.remove(id);
}
