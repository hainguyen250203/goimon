import type {
  ListPrintersParams,
  ListPrintersResult,
  PrinterRepository,
} from "../domain/printer.repository";

export async function listPrinters(
  repository: PrinterRepository,
  params: ListPrintersParams,
): Promise<ListPrintersResult> {
  return repository.list(params);
}
