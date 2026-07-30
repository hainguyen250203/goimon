export type PrinterScanResult = {
  ipAddress: string;
  port: number;
};

export interface PrinterScanner {
  /** Tự dò các subnet LAN đang kết nối (Wi-Fi lẫn dây) rồi quét port máy in trên từng subnet. */
  scan(port: number): Promise<PrinterScanResult[]>;
}
