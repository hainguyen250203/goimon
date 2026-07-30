import { and, asc, count, eq } from "drizzle-orm";

import { db } from "~/server/db";
import type { Printer, PrinterType } from "../domain/printer.entity";
import type {
  CreatePrinterParams,
  ListPrintersParams,
  ListPrintersResult,
  PrinterRepository,
  UpdatePrinterParams,
} from "../domain/printer.repository";
import { printer } from "./printer.schema";

function toEntity(row: {
  id: number;
  name: string;
  ipAddress: string;
  port: number;
  type: string;
  isActive: boolean;
}): Printer {
  return {
    id: row.id,
    name: row.name,
    ipAddress: row.ipAddress,
    port: row.port,
    type: row.type as PrinterType,
    isActive: row.isActive,
  };
}

async function findById(id: number): Promise<Printer> {
  const rows = await db.select().from(printer).where(eq(printer.id, id));
  const row = rows[0];
  if (!row) throw new Error("Không tìm thấy máy in.");
  return toEntity(row);
}

export const printerDrizzleRepository: PrinterRepository = {
  findById,

  async list({
    page,
    pageSize,
    isActive,
  }: ListPrintersParams): Promise<ListPrintersResult> {
    const offset = (page - 1) * pageSize;
    const where = isActive !== undefined ? eq(printer.isActive, isActive) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(printer)
        .where(where)
        .orderBy(asc(printer.name))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(printer).where(where),
    ]);

    return {
      items: rows.map(toEntity),
      total: totalRows[0]?.value ?? 0,
    };
  },

  async create(params: CreatePrinterParams): Promise<Printer> {
    const [row] = await db.insert(printer).values(params).returning({ id: printer.id });
    if (!row) throw new Error("Tạo máy in thất bại.");
    return findById(row.id);
  },

  async update({ id, ...params }: UpdatePrinterParams): Promise<Printer> {
    await db.update(printer).set(params).where(eq(printer.id, id));
    return findById(id);
  },

  async remove(id: number): Promise<void> {
    await db.delete(printer).where(eq(printer.id, id));
  },

  async listActiveByType(type: PrinterType): Promise<Printer[]> {
    const rows = await db
      .select()
      .from(printer)
      .where(and(eq(printer.type, type), eq(printer.isActive, true)));
    return rows.map(toEntity);
  },
};
