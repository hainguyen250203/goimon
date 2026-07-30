export type PrinterType = "bill" | "kitchen";

export type Printer = {
  id: number;
  name: string;
  ipAddress: string;
  port: number;
  type: PrinterType;
  isActive: boolean;
};
