import { and, asc, count, eq } from "drizzle-orm";

import { db } from "~/server/db";
import type { Promotion } from "../domain/promotion.entity";
import type {
  CreatePromotionParams,
  ListPromotionsParams,
  ListPromotionsResult,
  PromotionRepository,
  UpdatePromotionParams,
} from "../domain/promotion.repository";
import { promotion } from "./promotion.schema";

function toEntity(row: typeof promotion.$inferSelect): Promotion {
  return {
    id: row.id,
    name: row.name,
    discountType: row.discountType,
    discountValue: row.discountValue,
    isActive: row.isActive,
  };
}

export const promotionDrizzleRepository: PromotionRepository = {
  async list({
    page,
    pageSize,
    isActive,
  }: ListPromotionsParams): Promise<ListPromotionsResult> {
    const offset = (page - 1) * pageSize;
    const where = isActive !== undefined ? eq(promotion.isActive, isActive) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(promotion)
        .where(where)
        .orderBy(asc(promotion.name))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(promotion).where(where),
    ]);

    return {
      items: rows.map(toEntity),
      total: totalRows[0]?.value ?? 0,
    };
  },

  async listActive(): Promise<Promotion[]> {
    const rows = await db
      .select()
      .from(promotion)
      .where(and(eq(promotion.isActive, true)))
      .orderBy(asc(promotion.name));
    return rows.map(toEntity);
  },

  async findById(id: number): Promise<Promotion | null> {
    const rows = await db.select().from(promotion).where(eq(promotion.id, id));
    const row = rows[0];
    return row ? toEntity(row) : null;
  },

  async create(params: CreatePromotionParams): Promise<Promotion> {
    const [row] = await db.insert(promotion).values(params).returning();
    if (!row) throw new Error("Tạo khuyến mãi thất bại.");
    return toEntity(row);
  },

  async update({ id, ...params }: UpdatePromotionParams): Promise<Promotion> {
    const [row] = await db
      .update(promotion)
      .set(params)
      .where(eq(promotion.id, id))
      .returning();
    if (!row) throw new Error("Không tìm thấy khuyến mãi.");
    return toEntity(row);
  },

  async remove(id: number): Promise<void> {
    await db.delete(promotion).where(eq(promotion.id, id));
  },
};
