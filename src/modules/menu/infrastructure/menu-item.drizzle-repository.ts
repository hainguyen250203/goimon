import { asc, count, eq, inArray } from "drizzle-orm";

import { isForeignKeyViolation } from "~/lib/db-errors";
import { db } from "~/server/db";
import type { MenuItem } from "../domain/menu-item.entity";
import type {
  Category,
  CategoryOption,
  CreateCategoryParams,
  CreateMenuItemParams,
  ListMenuItemsParams,
  ListMenuItemsResult,
  MenuItemRepository,
  UpdateCategoryParams,
  UpdateMenuItemParams,
} from "../domain/menu-item.repository";
import { category, menuItem } from "./menu.schema";

function toEntity(row: {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string | null;
  price: number;
  isAvailable: boolean;
  isPublished: boolean;
}): MenuItem {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? "",
    price: row.price,
    isAvailable: row.isAvailable,
    isPublished: row.isPublished,
  };
}

async function findById(id: number): Promise<MenuItem> {
  const rows = await db
    .select({
      id: menuItem.id,
      name: menuItem.name,
      categoryId: menuItem.categoryId,
      categoryName: category.name,
      price: menuItem.price,
      isAvailable: menuItem.isAvailable,
      isPublished: menuItem.isPublished,
    })
    .from(menuItem)
    .leftJoin(category, eq(menuItem.categoryId, category.id))
    .where(eq(menuItem.id, id));
  const row = rows[0];
  if (!row) throw new Error("Không tìm thấy món ăn.");
  return toEntity(row);
}

async function findCategoryById(id: number): Promise<Category> {
  const rows = await db.select().from(category).where(eq(category.id, id));
  const row = rows[0];
  if (!row) throw new Error("Không tìm thấy danh mục.");
  return row;
}

export const menuItemDrizzleRepository: MenuItemRepository = {
  findById,
  findCategoryById,

  async list({
    page,
    pageSize,
    categoryId,
  }: ListMenuItemsParams): Promise<ListMenuItemsResult> {
    const offset = (page - 1) * pageSize;
    const where = categoryId ? eq(menuItem.categoryId, categoryId) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: menuItem.id,
          name: menuItem.name,
          categoryId: menuItem.categoryId,
          categoryName: category.name,
          price: menuItem.price,
          isAvailable: menuItem.isAvailable,
          isPublished: menuItem.isPublished,
        })
        .from(menuItem)
        .leftJoin(category, eq(menuItem.categoryId, category.id))
        .where(where)
        .orderBy(asc(category.name), asc(menuItem.name))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(menuItem).where(where),
    ]);

    return {
      items: rows.map(toEntity),
      total: totalRows[0]?.value ?? 0,
    };
  },

  async listCategoryOptions(): Promise<CategoryOption[]> {
    const rows = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(eq(category.isActive, true))
      .orderBy(asc(category.name));
    return rows;
  },

  async listForOrdering(): Promise<MenuItem[]> {
    const rows = await db
      .select({
        id: menuItem.id,
        name: menuItem.name,
        categoryId: menuItem.categoryId,
        categoryName: category.name,
        price: menuItem.price,
        isAvailable: menuItem.isAvailable,
        isPublished: menuItem.isPublished,
      })
      .from(menuItem)
      .leftJoin(category, eq(menuItem.categoryId, category.id))
      .where(eq(menuItem.isPublished, true))
      .orderBy(asc(category.name), asc(menuItem.name));
    return rows.map(toEntity);
  },

  async findByIds(ids: number[]): Promise<MenuItem[]> {
    if (ids.length === 0) return [];
    const rows = await db
      .select({
        id: menuItem.id,
        name: menuItem.name,
        categoryId: menuItem.categoryId,
        categoryName: category.name,
        price: menuItem.price,
        isAvailable: menuItem.isAvailable,
        isPublished: menuItem.isPublished,
      })
      .from(menuItem)
      .leftJoin(category, eq(menuItem.categoryId, category.id))
      .where(inArray(menuItem.id, ids));
    return rows.map(toEntity);
  },

  async create(params: CreateMenuItemParams): Promise<MenuItem> {
    const [row] = await db.insert(menuItem).values(params).returning({ id: menuItem.id });
    if (!row) throw new Error("Tạo món ăn thất bại.");
    return findById(row.id);
  },

  async update({ id, ...params }: UpdateMenuItemParams): Promise<MenuItem> {
    await db.update(menuItem).set(params).where(eq(menuItem.id, id));
    return findById(id);
  },

  async remove(id: number): Promise<void> {
    try {
      await db.delete(menuItem).where(eq(menuItem.id, id));
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new Error(
          "Món ăn đã được dùng trong đơn hàng, không thể xoá — hãy ẩn thay vì xoá.",
        );
      }
      throw error;
    }
  },

  async listCategoriesFull(): Promise<Category[]> {
    return db.select().from(category).orderBy(asc(category.name));
  },

  async createCategory(params: CreateCategoryParams): Promise<Category> {
    const [row] = await db.insert(category).values(params).returning();
    if (!row) throw new Error("Tạo danh mục thất bại.");
    return row;
  },

  async updateCategory({ id, ...params }: UpdateCategoryParams): Promise<Category> {
    const [row] = await db.update(category).set(params).where(eq(category.id, id)).returning();
    if (!row) throw new Error("Không tìm thấy danh mục.");
    return row;
  },

  async removeCategory(id: number): Promise<void> {
    try {
      await db.delete(category).where(eq(category.id, id));
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new Error("Danh mục đang có món ăn, không thể xoá — hãy ẩn thay vì xoá.");
      }
      throw error;
    }
  },
};
