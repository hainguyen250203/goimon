import { aliasedTable, count, desc, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { user } from "~/server/better-auth/schema";
import { Shift } from "../domain/shift.entity";
import type {
  ListShiftsParams,
  ListShiftsResult,
  ShiftRepository,
} from "../domain/shift.repository";
import { shift } from "./shift.schema";

type ShiftRow = typeof shift.$inferSelect;

function toEntity(row: ShiftRow): Shift {
  return new Shift({
    id: row.id,
    openedBy: row.openedBy,
    closedBy: row.closedBy,
    status: row.status,
    startTime: row.startTime,
    endTime: row.endTime,
  });
}

const opener = aliasedTable(user, "shift_opener");
const closer = aliasedTable(user, "shift_closer");

export const shiftDrizzleRepository: ShiftRepository = {
  async findOpen(): Promise<Shift | null> {
    const [row] = await db.select().from(shift).where(eq(shift.status, "open"));
    return row ? toEntity(row) : null;
  },

  async findById(id: number): Promise<Shift | null> {
    const [row] = await db.select().from(shift).where(eq(shift.id, id));
    return row ? toEntity(row) : null;
  },

  async save(shiftEntity: Shift): Promise<Shift> {
    const values = {
      openedBy: shiftEntity.openedBy,
      closedBy: shiftEntity.closedBy,
      status: shiftEntity.status,
      startTime: shiftEntity.startTime,
      endTime: shiftEntity.endTime,
    };

    if (shiftEntity.id === null) {
      const [row] = await db.insert(shift).values(values).returning();
      if (!row) throw new Error("Mở ca thất bại.");
      return toEntity(row);
    }

    const [row] = await db.update(shift).set(values).where(eq(shift.id, shiftEntity.id)).returning();
    if (!row) throw new Error("Không tìm thấy ca.");
    return toEntity(row);
  },

  async list({ page, pageSize, status }: ListShiftsParams): Promise<ListShiftsResult> {
    const offset = (page - 1) * pageSize;
    const where = status ? eq(shift.status, status) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: shift.id,
          openedByName: opener.name,
          closedByName: closer.name,
          status: shift.status,
          startTime: shift.startTime,
          endTime: shift.endTime,
        })
        .from(shift)
        .leftJoin(opener, eq(shift.openedBy, opener.id))
        .leftJoin(closer, eq(shift.closedBy, closer.id))
        .where(where)
        .orderBy(desc(shift.startTime))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(shift).where(where),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        openedByName: row.openedByName ?? "",
        closedByName: row.closedByName,
        status: row.status,
        startTime: row.startTime,
        endTime: row.endTime,
      })),
      total: totalRows[0]?.value ?? 0,
    };
  },
};
