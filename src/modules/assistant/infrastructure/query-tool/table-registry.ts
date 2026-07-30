import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { category, menuItem } from "~/modules/menu/infrastructure/menu.schema";
import { order, orderEvent, orderItem } from "~/modules/order/infrastructure/order.schema";
import { paymentConfig } from "~/modules/payment-config/infrastructure/payment-config.schema";
import { printer } from "~/modules/printer/infrastructure/printer.schema";
import { promotion } from "~/modules/promotion/infrastructure/promotion.schema";
import { shift } from "~/modules/shift/infrastructure/shift.schema";
import { activityLog } from "~/modules/activity-log/infrastructure/activity-log.schema";
import { area, restaurantTable } from "~/modules/table/infrastructure/table.schema";

import { AssistantQueryError } from "./assistant-query.error";

/**
 * Whitelist bảng được phép truy vấn — KHÔNG bao gồm users/sessions/accounts/
 * verifications (BetterAuth), vì chứa password hash/số điện thoại nhân viên.
 * Key = tên bảng SQL thật, để LLM dùng đúng tên xuất hiện trong schema context
 * (xem schema-context.ts) mà không có tầng ánh xạ tên thứ 2.
 */
export const ALLOWED_TABLES: Record<string, PgTable> = {
  categories: category,
  menu_items: menuItem,
  areas: area,
  tables: restaurantTable,
  orders: order,
  order_items: orderItem,
  order_events: orderEvent,
  promotions: promotion,
  shifts: shift,
  printers: printer,
  payment_config: paymentConfig,
  activity_logs: activityLog,
};

export function isAllowedTable(tableName: string): boolean {
  return Object.hasOwn(ALLOWED_TABLES, tableName);
}

/** Lấy toàn bộ cột thật của 1 bảng được phép — tự suy ra từ Drizzle, không hard-code trùng lặp. */
export function getAllowedColumns(tableName: string): Record<string, PgColumn> {
  const table = ALLOWED_TABLES[tableName];
  if (!table) {
    throw new AssistantQueryError(`Bảng "${tableName}" không được phép truy vấn.`);
  }
  return getTableColumns(table) as unknown as Record<string, PgColumn>;
}

export type ForeignKeyEdge = {
  /** Tên thuộc tính JS (camelCase) trong Drizzle schema, không phải tên cột SQL. */
  fromColumn: string;
  toTable: string;
  toColumn: string;
};

/** Cột trong Drizzle được định nghĩa dạng `shiftId: integer("shift_id")` — key JS
 * (camelCase) khác tên cột SQL thật (snake_case). FK metadata của drizzle-orm trả
 * về tên cột SQL, nên cần dò ngược lại key JS tương ứng để khớp với `columnRef`
 * mà model dùng (luôn là camelCase, giống với `columns`/`filter` ở nơi khác). */
function findColumnKeyBySqlName(table: PgTable, sqlName: string): string {
  const columns = getTableColumns(table) as unknown as Record<string, PgColumn>;
  for (const [key, column] of Object.entries(columns)) {
    if (column.name === sqlName) return key;
  }
  return sqlName;
}

/** Danh sách khoá ngoại THẬT của 1 bảng — dùng để duyệt xem 1 join có hợp lệ hay không. */
export function getForeignKeyEdges(tableName: string): ForeignKeyEdge[] {
  const table = ALLOWED_TABLES[tableName];
  if (!table) return [];
  return getTableConfig(table).foreignKeys.map((fk) => {
    const ref = fk.reference();
    const toTableConfig = getTableConfig(ref.foreignTable);
    return {
      fromColumn: findColumnKeyBySqlName(table, ref.columns[0]!.name),
      toTable: toTableConfig.name,
      toColumn: findColumnKeyBySqlName(ref.foreignTable, ref.foreignColumns[0]!.name),
    };
  });
}
