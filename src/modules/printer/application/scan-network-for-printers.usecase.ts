import type { PrinterScanner, PrinterScanResult } from "../domain/printer-scanner";

export async function scanNetworkForPrinters(
  scanner: PrinterScanner,
  port: number,
): Promise<PrinterScanResult[]> {
  return scanner.scan(port);
}
