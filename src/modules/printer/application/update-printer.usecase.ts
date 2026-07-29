import type {
  PrinterRepository,
  UpdatePrinterParams,
} from "../domain/printer.repository";
import type { Printer } from "../domain/printer.entity";

export type UpdatePrinterResult = {
  before: Printer;
  after: Printer;
};

export async function updatePrinter(
  repository: PrinterRepository,
  params: UpdatePrinterParams,
): Promise<UpdatePrinterResult> {
  const before = await repository.findById(params.id);
  const after = await repository.update(params);
  return { before, after };
}
