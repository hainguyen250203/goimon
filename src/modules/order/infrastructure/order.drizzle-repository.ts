import { count, desc, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { area, restaurantTable } from "~/modules/table/infrastructure/table.schema";
import { user } from "~/server/better-auth/schema";
import type {
  OrderListItem,
  OrderStatus,
  PaymentMethod,
} from "../domain/order-list-item.entity";
import type {
  ListOrdersParams,
  ListOrdersResult,
  OrderRepository,
} from "../domain/order.repository";
import { order } from "./order.schema";

function toEntity(row: {
  id: number;
  tableName: string | null;
  areaName: string | null;
  status: OrderStatus;
  totalAmount: number | null;
  paymentMethod: PaymentMethod | null;
  createdByName: string | null;
  createdAt: Date;
  printedAt: Date | null;
  paidConfirmedAt: Date | null;
}): OrderListItem {
  return {
    id: row.id,
    tableName: row.tableName ?? "",
    areaName: row.areaName ?? "",
    status: row.status,
    totalAmount: row.totalAmount,
    paymentMethod: row.paymentMethod,
    createdByName: row.createdByName ?? "",
    createdAt: row.createdAt,
    printedAt: row.printedAt,
    paidConfirmedAt: row.paidConfirmedAt,
  };
}

export const orderDrizzleRepository: OrderRepository = {
  async list({ page, pageSize, status }: ListOrdersParams): Promise<ListOrdersResult> {
    const offset = (page - 1) * pageSize;
    const where = status ? eq(order.status, status) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: order.id,
          tableName: restaurantTable.name,
          areaName: area.name,
          status: order.status,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          createdByName: user.name,
          createdAt: order.createdAt,
          printedAt: order.printedAt,
          paidConfirmedAt: order.paidConfirmedAt,
        })
        .from(order)
        .leftJoin(restaurantTable, eq(order.tableId, restaurantTable.id))
        .leftJoin(area, eq(restaurantTable.areaId, area.id))
        .leftJoin(user, eq(order.createdBy, user.id))
        .where(where)
        .orderBy(desc(order.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(order).where(where),
    ]);

    return {
      items: rows.map(toEntity),
      total: totalRows[0]?.value ?? 0,
    };
  },
};
