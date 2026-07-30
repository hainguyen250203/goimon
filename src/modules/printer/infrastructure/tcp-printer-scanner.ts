import net from "node:net";
import os from "node:os";

import type { PrinterScanner, PrinterScanResult } from "../domain/printer-scanner";

const PROBE_TIMEOUT_MS = 500;
// Quét song song theo lô thay vì tuần tự từng IP — script gốc quét tuần tự
// 254 IP x tối đa 500ms timeout ~ 127s/subnet, quá lâu cho 1 lượt bấm nút
// trên UI. Quét theo lô 32 IP cùng lúc đưa thời gian tệ nhất xuống còn
// khoảng (254/32) x 500ms ~ 4s/subnet.
const CONCURRENCY = 32;

function probe(ipAddress: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(PROBE_TIMEOUT_MS);

    const finish = (isOpen: boolean) => {
      socket.destroy();
      resolve(isOpen);
    };

    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
    socket.connect(port, ipAddress);
  });
}

/**
 * Máy tính chạy server này vừa nối Wi-Fi (mạng internet) vừa nối dây LAN
 * thẳng tới máy in — 2 card mạng có thể ở 2 subnet khác nhau, nên không thể
 * hardcode 1 dải "192.168.1.x" như script gốc (`scan_printer.js`). Tự đọc
 * toàn bộ card mạng IPv4 không phải loopback, suy ra dải /24 của từng card
 * rồi quét hết — luôn bắt được máy in dù nó nằm ở card dây hay card Wi-Fi.
 */
function listCandidateSubnets(): string[] {
  const interfaces = os.networkInterfaces();
  const subnets = new Set<string>();

  for (const addresses of Object.values(interfaces)) {
    for (const info of addresses ?? []) {
      if (info.internal || info.family !== "IPv4") continue;
      const octets = info.address.split(".");
      if (octets.length !== 4) continue;
      subnets.add(octets.slice(0, 3).join("."));
    }
  }

  return [...subnets];
}

export const tcpPrinterScanner: PrinterScanner = {
  async scan(port: number): Promise<PrinterScanResult[]> {
    const subnets = listCandidateSubnets();
    const found: PrinterScanResult[] = [];

    for (const subnet of subnets) {
      const hosts = Array.from({ length: 254 }, (_, i) => i + 1);
      for (let i = 0; i < hosts.length; i += CONCURRENCY) {
        const batch = hosts.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (host) => {
            const ipAddress = `${subnet}.${host}`;
            const isOpen = await probe(ipAddress, port);
            return isOpen ? { ipAddress, port } : null;
          }),
        );
        for (const result of results) {
          if (result) found.push(result);
        }
      }
    }

    return found;
  },
};
