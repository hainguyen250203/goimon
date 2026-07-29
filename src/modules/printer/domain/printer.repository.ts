import type { Printer } from "./printer.entity";

export type ListPrintersParams = {
  page: number;
  pageSize: number;
  isActive?: boolean;
};

export type ListPrintersResult = {
  items: Printer[];
  total: number;
};

export type CreatePrinterParams = {
  name: string;
  ipAddress: string;
  port: number;
  isActive: boolean;
};

export type UpdatePrinterParams = CreatePrinterParams & { id: number };

export interface PrinterRepository {
  list(params: ListPrintersParams): Promise<ListPrintersResult>;
  /** Dùng để lấy snapshot "before" khi ghi activity log lúc update — xem update-printer.usecase.ts. */
  findById(id: number): Promise<Printer>;
  create(params: CreatePrinterParams): Promise<Printer>;
  update(params: UpdatePrinterParams): Promise<Printer>;
  /** Không có bảng nào khác tham chiếu printers — xoá thật (hard delete). */
  remove(id: number): Promise<void>;
}
