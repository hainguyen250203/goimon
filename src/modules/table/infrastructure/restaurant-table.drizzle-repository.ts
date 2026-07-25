import { and, asc, count, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { isForeignKeyViolation } from "~/lib/db-errors";
import type { RestaurantTable, TableStatus } from "../domain/restaurant-table.entity";
import type {
  AreaOption,
  CreateTableParams,
  ListTablesParams,
  ListTablesResult,
  RestaurantTableRepository,
  UpdateTableParams,
} from "../domain/restaurant-table.repository";
import { area, restaurantTable } from "./table.schema";

function toEntity(row: {
  id: number;
  name: string;
  areaId: number;
  areaName: string | null;
  status: TableStatus;
}): RestaurantTable {
  return {
    id: row.id,
    name: row.name,
    areaId: row.areaId,
    areaName: row.areaName ?? "",
    status: row.status,
  };
}

async function findById(id: number): Promise<RestaurantTable> {
  const rows = await db
    .select({
      id: restaurantTable.id,
      name: restaurantTable.name,
      areaId: restaurantTable.areaId,
      areaName: area.name,
      status: restaurantTable.status,
    })
    .from(restaurantTable)
    .leftJoin(area, eq(restaurantTable.areaId, area.id))
    .where(eq(restaurantTable.id, id));
  const row = rows[0];
  if (!row) throw new Error("Không tìm thấy bàn.");
  return toEntity(row);
}

export const restaurantTableDrizzleRepository: RestaurantTableRepository = {
  async list({
    page,
    pageSize,
    areaId,
    status,
  }: ListTablesParams): Promise<ListTablesResult> {
    const offset = (page - 1) * pageSize;
    const conditions = [
      areaId ? eq(restaurantTable.areaId, areaId) : undefined,
      status ? eq(restaurantTable.status, status) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: restaurantTable.id,
          name: restaurantTable.name,
          areaId: restaurantTable.areaId,
          areaName: area.name,
          status: restaurantTable.status,
        })
        .from(restaurantTable)
        .leftJoin(area, eq(restaurantTable.areaId, area.id))
        .where(where)
        .orderBy(asc(area.name), asc(restaurantTable.name))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(restaurantTable).where(where),
    ]);

    return {
      items: rows.map(toEntity),
      total: totalRows[0]?.value ?? 0,
    };
  },

  async listAreaOptions(): Promise<AreaOption[]> {
    const rows = await db
      .select({ id: area.id, name: area.name })
      .from(area)
      .where(eq(area.isActive, true))
      .orderBy(asc(area.name));
    return rows;
  },

  async create(params: CreateTableParams): Promise<RestaurantTable> {
    const [row] = await db
      .insert(restaurantTable)
      .values(params)
      .returning({ id: restaurantTable.id });
    if (!row) throw new Error("Tạo bàn thất bại.");
    return findById(row.id);
  },

  async update({ id, ...params }: UpdateTableParams): Promise<RestaurantTable> {
    await db.update(restaurantTable).set(params).where(eq(restaurantTable.id, id));
    return findById(id);
  },

  async remove(id: number): Promise<void> {
    try {
      await db.delete(restaurantTable).where(eq(restaurantTable.id, id));
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new Error(
          "Bàn đã có lịch sử đơn hàng, không thể xoá — hãy đổi tên hoặc ẩn khu vực thay vì xoá.",
        );
      }
      throw error;
    }
  },

  async setStatus(id: number, status: TableStatus): Promise<void> {
    await db.update(restaurantTable).set({ status }).where(eq(restaurantTable.id, id));
  },

  async listAll(): Promise<RestaurantTable[]> {
    const rows = await db
      .select({
        id: restaurantTable.id,
        name: restaurantTable.name,
        areaId: restaurantTable.areaId,
        areaName: area.name,
        status: restaurantTable.status,
      })
      .from(restaurantTable)
      .leftJoin(area, eq(restaurantTable.areaId, area.id))
      .orderBy(asc(area.name), asc(restaurantTable.name));
    return rows.map(toEntity);
  },
};
