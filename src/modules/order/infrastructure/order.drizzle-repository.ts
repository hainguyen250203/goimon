import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "~/server/db";
import { area, restaurantTable } from "~/modules/table/infrastructure/table.schema";
import { user } from "~/server/better-auth/schema";
import { Order, type OrderLineItem, type OrderPromotion } from "../domain/order.entity";
import type {
  OrderListItem,
  OrderListItemLine,
  OrderStatus,
  PaymentMethod,
} from "../domain/order-list-item.entity";
import type {
  ActiveOrderSummary,
  ListOrderItemEventsParams,
  ListOrderItemEventsResult,
  ListOrdersParams,
  ListOrdersResult,
  ListTableTransferEventsParams,
  ListTableTransferEventsResult,
  OrderRepository,
  OrderTimelineEvent,
  RecordOrderEventParams,
  ShiftOrderStats,
  ShiftSummary,
} from "../domain/order.repository";
import { order, orderEvent, orderItem } from "./order.schema";

function toEntity(
  row: {
    id: number;
    tableName: string | null;
    areaName: string | null;
    shiftId: number | null;
    status: OrderStatus;
    totalAmount: number | null;
    promotionName: string | null;
    paymentMethod: PaymentMethod | null;
    createdByName: string | null;
    createdAt: Date;
    printedAt: Date | null;
    paidConfirmedAt: Date | null;
  },
  items: OrderListItemLine[],
): OrderListItem {
  return {
    id: row.id,
    tableName: row.tableName ?? "",
    areaName: row.areaName ?? "",
    shiftId: row.shiftId,
    status: row.status,
    totalAmount: row.totalAmount,
    promotionName: row.promotionName,
    paymentMethod: row.paymentMethod,
    createdByName: row.createdByName ?? "",
    createdAt: row.createdAt,
    printedAt: row.printedAt,
    paidConfirmedAt: row.paidConfirmedAt,
    items,
  };
}

type OrderRow = typeof order.$inferSelect;
type OrderItemRow = typeof orderItem.$inferSelect;

function toOrderEntity(row: OrderRow, itemRows: OrderItemRow[]): Order {
  const items: OrderLineItem[] = itemRows.map((item) => ({
    id: item.id,
    menuItemId: item.menuItemId,
    itemName: item.itemName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    note: item.note,
  }));
  const promotion: OrderPromotion | null =
    row.promotionId !== null &&
    row.promotionName !== null &&
    row.promotionDiscountType !== null &&
    row.promotionDiscountValue !== null
      ? {
          id: row.promotionId,
          name: row.promotionName,
          discountType: row.promotionDiscountType,
          discountValue: row.promotionDiscountValue,
        }
      : null;

  return new Order({
    id: row.id,
    tableId: row.tableId,
    shiftId: row.shiftId,
    status: row.status,
    createdBy: row.createdBy,
    note: row.note,
    totalAmount: row.totalAmount,
    promotion,
    printedAt: row.printedAt,
    paymentMethod: row.paymentMethod,
    paidConfirmedBy: row.paidConfirmedBy,
    paidConfirmedAt: row.paidConfirmedAt,
    createdAt: row.createdAt,
    items,
  });
}

async function loadOrder(
  executor: typeof db,
  orderId: number,
): Promise<Order | null> {
  const [orderRow] = await executor.select().from(order).where(eq(order.id, orderId));
  if (!orderRow) return null;
  const itemRows = await executor
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId));
  return toOrderEntity(orderRow, itemRows);
}

export const orderDrizzleRepository: OrderRepository = {
  async list({
    page,
    pageSize,
    status,
    search,
    shiftId,
    createdBy,
  }: ListOrdersParams): Promise<ListOrdersResult> {
    const offset = (page - 1) * pageSize;
    const conditions = [];
    if (status) conditions.push(eq(order.status, status));
    if (shiftId) conditions.push(eq(order.shiftId, shiftId));
    if (createdBy) conditions.push(eq(order.createdBy, createdBy));

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      // Lọc đơn có ít nhất 1 món khớp tên (không dấu) — cần extension
      // unaccent (npm run db:extensions).
      const matchingOrders = await db
        .selectDistinct({ orderId: orderItem.orderId })
        .from(orderItem)
        .where(sql`unaccent(${orderItem.itemName}) ilike unaccent(${`%${trimmedSearch}%`})`);
      const matchingOrderIds = matchingOrders.map((r) => r.orderId);
      if (matchingOrderIds.length === 0) {
        return { items: [], total: 0 };
      }
      conditions.push(inArray(order.id, matchingOrderIds));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: order.id,
          tableName: restaurantTable.name,
          areaName: area.name,
          shiftId: order.shiftId,
          status: order.status,
          totalAmount: order.totalAmount,
          promotionName: order.promotionName,
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

    const orderIds = rows.map((r) => r.id);
    const itemRows =
      orderIds.length > 0
        ? await db
            .select({
              orderId: orderItem.orderId,
              id: orderItem.id,
              itemName: orderItem.itemName,
              unitPrice: orderItem.unitPrice,
              quantity: orderItem.quantity,
            })
            .from(orderItem)
            .where(inArray(orderItem.orderId, orderIds))
        : [];
    const itemsByOrderId = new Map<number, OrderListItemLine[]>();
    for (const item of itemRows) {
      const list = itemsByOrderId.get(item.orderId) ?? [];
      list.push({
        id: item.id,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      });
      itemsByOrderId.set(item.orderId, list);
    }

    return {
      items: rows.map((row) => toEntity(row, itemsByOrderId.get(row.id) ?? [])),
      total: totalRows[0]?.value ?? 0,
    };
  },

  async findActiveByTableId(tableId: number): Promise<Order | null> {
    const [orderRow] = await db
      .select()
      .from(order)
      .where(and(eq(order.tableId, tableId), eq(order.status, "open")));
    if (!orderRow) return null;
    const itemRows = await db
      .select()
      .from(orderItem)
      .where(eq(orderItem.orderId, orderRow.id));
    return toOrderEntity(orderRow, itemRows);
  },

  async findById(id: number): Promise<Order | null> {
    return loadOrder(db, id);
  },

  async save(orderEntity: Order): Promise<Order> {
    return db.transaction(async (tx) => {
      const values = {
        tableId: orderEntity.tableId,
        shiftId: orderEntity.shiftId,
        status: orderEntity.status,
        createdBy: orderEntity.createdBy,
        note: orderEntity.note,
        totalAmount: orderEntity.totalAmount,
        promotionId: orderEntity.promotion?.id ?? null,
        promotionName: orderEntity.promotion?.name ?? null,
        promotionDiscountType: orderEntity.promotion?.discountType ?? null,
        promotionDiscountValue: orderEntity.promotion?.discountValue ?? null,
        printedAt: orderEntity.printedAt,
        paymentMethod: orderEntity.paymentMethod,
        paidConfirmedBy: orderEntity.paidConfirmedBy,
        paidConfirmedAt: orderEntity.paidConfirmedAt,
      };

      let orderId = orderEntity.id;
      let isNewOrder = false;
      if (orderId === null) {
        const [row] = await tx.insert(order).values(values).returning({ id: order.id });
        if (!row) throw new Error("Tạo đơn hàng thất bại.");
        orderId = row.id;
        isNewOrder = true;
      } else {
        await tx.update(order).set(values).where(eq(order.id, orderId));
      }

      // Diff order_items: xoá dòng không còn trong entity, insert dòng mới
      // (id === null), CHỈ update dòng đã có nếu quantity/note thực sự đổi —
      // trước đây update vô điều kiện toàn bộ items mỗi lần save(), khiến 1
      // lần bấm +1 số lượng tốn thêm N query thừa (N = số món trong đơn).
      const existingRows = await tx
        .select({ id: orderItem.id, quantity: orderItem.quantity, note: orderItem.note })
        .from(orderItem)
        .where(eq(orderItem.orderId, orderId));
      const existingById = new Map(existingRows.map((r) => [r.id, r]));
      const keptIds = new Set(
        orderEntity.items.filter((i) => i.id !== null).map((i) => i.id!),
      );
      const toDelete = existingRows.map((r) => r.id).filter((id) => !keptIds.has(id));
      if (toDelete.length > 0) {
        await tx.delete(orderItem).where(inArray(orderItem.id, toDelete));
      }

      for (const item of orderEntity.items) {
        if (item.id === null) {
          const [row] = await tx
            .insert(orderItem)
            .values({
              orderId,
              menuItemId: item.menuItemId,
              itemName: item.itemName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              note: item.note,
            })
            .returning({ id: orderItem.id });
          if (!row) throw new Error("Thêm món thất bại.");
          // Gán lại id thật vừa insert lên entity trong memory — tránh phải
          // đọc lại toàn bộ order từ DB chỉ để lấy id món mới.
          item.id = row.id;
        } else {
          const existing = existingById.get(item.id);
          const changed =
            !existing || existing.quantity !== item.quantity || existing.note !== item.note;
          if (changed) {
            await tx
              .update(orderItem)
              .set({ quantity: item.quantity, note: item.note })
              .where(eq(orderItem.id, item.id));
          }
        }
      }

      if (isNewOrder) {
        // id trên entity gốc là readonly (null lúc chưa persist) — phải dựng
        // entity mới để mang id thật, không re-SELECT lại từ DB.
        return new Order({
          id: orderId,
          tableId: orderEntity.tableId,
          shiftId: orderEntity.shiftId,
          status: orderEntity.status,
          createdBy: orderEntity.createdBy,
          note: orderEntity.note,
          totalAmount: orderEntity.totalAmount,
          promotion: orderEntity.promotion,
          printedAt: orderEntity.printedAt,
          paymentMethod: orderEntity.paymentMethod,
          paidConfirmedBy: orderEntity.paidConfirmedBy,
          paidConfirmedAt: orderEntity.paidConfirmedAt,
          createdAt: orderEntity.createdAt,
          items: orderEntity.items,
        });
      }
      // DB đã khớp values ở trên; items trong memory đã có id thật (gán ở
      // vòng lặp trên) — trả thẳng entity, không cần đọc lại từ DB.
      return orderEntity;
    });
  },

  async recordEvent(params: RecordOrderEventParams): Promise<void> {
    await db.insert(orderEvent).values({
      orderId: params.orderId,
      actorId: params.actorId,
      eventType: params.eventType,
      payload: params.payload ?? null,
      itemsSummary: params.itemsSummary ?? null,
    });
  },

  async listActive(): Promise<ActiveOrderSummary[]> {
    const rows = await db
      .select({
        tableId: order.tableId,
        orderId: order.id,
        createdAt: order.createdAt,
        subtotal: sql<number>`coalesce(sum(${orderItem.unitPrice} * ${orderItem.quantity}), 0)`.mapWith(
          Number,
        ),
      })
      .from(order)
      .leftJoin(orderItem, eq(orderItem.orderId, order.id))
      .where(eq(order.status, "open"))
      .groupBy(order.id, order.tableId, order.createdAt);
    return rows;
  },

  async getShiftSummary(shiftId: number): Promise<ShiftSummary> {
    const [row] = await db
      .select({
        orderCount: count(),
        totalRevenue: sql<number>`coalesce(sum(${order.totalAmount}), 0)`.mapWith(Number),
      })
      .from(order)
      .where(and(eq(order.shiftId, shiftId), eq(order.status, "paid")));
    return { orderCount: row?.orderCount ?? 0, totalRevenue: row?.totalRevenue ?? 0 };
  },

  async getShiftOrderStats(shiftId: number): Promise<ShiftOrderStats> {
    const rows = await db
      .select({
        status: order.status,
        orderCount: count(),
        revenue: sql<number>`coalesce(sum(${order.totalAmount}), 0)`.mapWith(Number),
      })
      .from(order)
      .where(eq(order.shiftId, shiftId))
      .groupBy(order.status);

    const byStatus = new Map(rows.map((r) => [r.status, r]));
    return {
      totalRevenue: byStatus.get("paid")?.revenue ?? 0,
      paidOrderCount: byStatus.get("paid")?.orderCount ?? 0,
      openOrderCount: byStatus.get("open")?.orderCount ?? 0,
      cancelledOrderCount: byStatus.get("cancelled")?.orderCount ?? 0,
    };
  },

  async listOrderItemEvents({
    page,
    pageSize,
    search,
    actorId,
  }: ListOrderItemEventsParams): Promise<ListOrderItemEventsResult> {
    const offset = (page - 1) * pageSize;
    const trimmedSearch = search?.trim();
    const conditions = [inArray(orderEvent.eventType, ["items_added", "items_removed"])];
    if (actorId) conditions.push(eq(orderEvent.actorId, actorId));
    if (trimmedSearch) {
      conditions.push(
        sql`unaccent(${orderEvent.itemsSummary}) ilike unaccent(${`%${trimmedSearch}%`})`,
      );
    }
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: orderEvent.id,
          eventType: orderEvent.eventType,
          tableName: restaurantTable.name,
          actorName: user.name,
          payload: orderEvent.payload,
          createdAt: orderEvent.createdAt,
        })
        .from(orderEvent)
        .innerJoin(order, eq(orderEvent.orderId, order.id))
        .innerJoin(restaurantTable, eq(order.tableId, restaurantTable.id))
        .innerJoin(user, eq(orderEvent.actorId, user.id))
        .where(where)
        .orderBy(desc(orderEvent.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(orderEvent).where(where),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        eventType: row.eventType as "items_added" | "items_removed",
        tableName: row.tableName ?? "",
        actorName: row.actorName ?? "",
        items: Array.isArray((row.payload as { items?: unknown })?.items)
          ? (
              row.payload as {
                items: { itemName: string; quantity: number; unitPrice: number; note: string | null }[];
              }
            ).items
          : [],
        createdAt: row.createdAt,
      })),
      total: totalRows[0]?.value ?? 0,
    };
  },

  async getOrderTimeline(orderId: number): Promise<OrderTimelineEvent[]> {
    const rows = await db
      .select({
        id: orderEvent.id,
        eventType: orderEvent.eventType,
        actorName: user.name,
        payload: orderEvent.payload,
        createdAt: orderEvent.createdAt,
      })
      .from(orderEvent)
      .innerJoin(user, eq(orderEvent.actorId, user.id))
      .where(eq(orderEvent.orderId, orderId))
      .orderBy(desc(orderEvent.createdAt));

    return rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      actorName: row.actorName ?? "",
      payload: row.payload,
      createdAt: row.createdAt,
    }));
  },

  async listTableTransferEvents({
    page,
    pageSize,
    actorId,
  }: ListTableTransferEventsParams): Promise<ListTableTransferEventsResult> {
    const offset = (page - 1) * pageSize;
    const conditions = [inArray(orderEvent.eventType, ["table_changed", "items_transferred_out"])];
    if (actorId) conditions.push(eq(orderEvent.actorId, actorId));
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: orderEvent.id,
          eventType: orderEvent.eventType,
          tableName: restaurantTable.name,
          actorName: user.name,
          payload: orderEvent.payload,
          createdAt: orderEvent.createdAt,
        })
        .from(orderEvent)
        .innerJoin(order, eq(orderEvent.orderId, order.id))
        .innerJoin(restaurantTable, eq(order.tableId, restaurantTable.id))
        .innerJoin(user, eq(orderEvent.actorId, user.id))
        .where(where)
        .orderBy(desc(orderEvent.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(orderEvent).where(where),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        eventType: row.eventType as "table_changed" | "items_transferred_out",
        tableName: row.tableName ?? "",
        actorName: row.actorName ?? "",
        payload: row.payload,
        createdAt: row.createdAt,
      })),
      total: totalRows[0]?.value ?? 0,
    };
  },
};
