import escpos from "escpos";
import EscposNetwork from "escpos-network";

import type { Printer } from "../domain/printer.entity";
import type { PrintOutcome } from "../domain/print-outcome";

// escpos không tự có adapter mạng — escpos-network cung cấp adapter đó, gán
// làm `Network` giống hệt cách package mong đợi (require("escpos").Network =
// require("escpos-network")). escpos-network không có ESM default export
// chuẩn nên phải gán thủ công thay vì import trực tiếp `escpos.Network`.
(escpos as any).Network = EscposNetwork;

const PRINT_TIMEOUT_MS = 10_000;

function printImageToDevice(ipAddress: string, port: number, imageBuffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      reject(new Error("Hết thời gian chờ kết nối máy in."));
    }, PRINT_TIMEOUT_MS);

    const device = new (escpos as any).Network(ipAddress, port);
    const printer = new (escpos as any).Printer(device);

    device.open((err: Error | null) => {
      if (timedOut) return;
      if (err) {
        clearTimeout(timeout);
        reject(err);
        return;
      }

      (escpos as any).Image.load(imageBuffer, "image/png", (imageResult: unknown) => {
        if (timedOut) return;
        if (imageResult instanceof Error) {
          clearTimeout(timeout);
          printer.close();
          reject(imageResult);
          return;
        }

        printer
          .image(imageResult)
          .then(() => {
            if (timedOut) return;
            try {
              printer.cut();
            } catch {
              // Máy in không hỗ trợ cắt giấy tự động — bỏ qua, không phải lỗi.
            }
            printer.close();
            clearTimeout(timeout);
            resolve();
          })
          .catch((error: unknown) => {
            if (timedOut) return;
            printer.close();
            clearTimeout(timeout);
            reject(error instanceof Error ? error : new Error(String(error)));
          });
      });
    });
  });
}

/**
 * Gửi CÙNG 1 ảnh (hoá đơn hoặc phiếu bếp) tới danh sách máy in — dùng chung
 * cho escpos-bill-printer.ts và escpos-kitchen-ticket-printer.ts. Mỗi máy
 * chạy try/catch RIÊNG, lỗi 1 máy không chặn các máy còn lại, không bao giờ
 * throw ra ngoài (xem PrintOutcome).
 */
export async function printImageToPrinters(printers: Printer[], imageBuffer: Buffer): Promise<PrintOutcome[]> {
  const outcomes: PrintOutcome[] = [];
  for (const printer of printers) {
    try {
      await printImageToDevice(printer.ipAddress, printer.port, imageBuffer);
      outcomes.push({
        printerId: printer.id,
        printerName: printer.name,
        ipAddress: printer.ipAddress,
        success: true,
      });
    } catch (error) {
      outcomes.push({
        printerId: printer.id,
        printerName: printer.name,
        ipAddress: printer.ipAddress,
        success: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định.",
      });
    }
  }
  return outcomes;
}
