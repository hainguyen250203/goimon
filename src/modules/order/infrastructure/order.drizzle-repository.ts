import { and, count, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "~/server/db";
import { area, restaurantTable } from "~/modules/table/infrastructure/table.schema";
import { category, menuItem } from "~/modules/menu/infrastructure/menu.schema";
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
  CategoryRevenue,
  ListOrderItemEventsParams,
  ListOrderItemEventsResult,
  ListOrdersParams,
  ListOrdersResult,
  ListTableTransferEventsParams,
  ListTableTransferEventsResult,
  OrderRepository,
  OrderTimelineEvent,
  PaymentMethodRevenue,
  PromotionUsageRow,
  RecordOrderEventParams,
  ShiftOrderStats,
  ShiftRevenueRow,
  ShiftSummary,
  TopSellingItem,
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
    deletedAt: Date | null;
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
    deletedAt: row.deletedAt,
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
  const [orderRow] = await executor
    .select()
    .from(order)
    .where(and(eq(order.id, orderId), isNull(order.deletedAt)));
  if (!orderRow) return null;
  const itemRows = await executor
    .select()
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId));
  return toOrderEntity(orderRow, itemRows);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Thân xử lý upsert 1 order + diff order_items — tách khỏi save()/saveMany()
 * để dùng chung được executor `tx` do CẢ 2 truyền vào, đảm bảo nhiều order
 * lưu trong 1 lần saveMany() luôn nằm chung 1 transaction. */
async function saveOrderTx(tx: Tx, orderEntity: Order): Promise<Order> {
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
  const keptIds = new Set(orderEntity.items.filter((i) => i.id !== null).map((i) => i.id!));
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
}

export const orderDrizzleRepository: OrderRepository = {
  async list({
    page,
    pageSize,
    status,
    search,
    shiftId,
    createdBy,
    deleted,
  }: ListOrdersParams): Promise<ListOrdersResult> {
    const offset = (page - 1) * pageSize;
    // Luôn áp dụng — mặc định loại đơn đã xoá khỏi MỌI danh sách (kể cả
    // /goi-mon/cua-hang), `deleted: true` (chỉ superadmin, chặn ở router) đảo
    // ngược lại để CHỈ xem đơn đã xoá.
    const conditions = [deleted ? isNotNull(order.deletedAt) : isNull(order.deletedAt)];
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
          deletedAt: order.deletedAt,
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
      .where(and(eq(order.tableId, tableId), eq(order.status, "open"), isNull(order.deletedAt)));
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
    return db.transaction((tx) => saveOrderTx(tx, orderEntity));
  },

  // 1 transaction DUY NHẤT cho nhiều order — bắt buộc dùng khi 1 nghiệp vụ
  // đụng tới >1 order cùng lúc (chuyển món/gộp đơn: cộng vào đích + trừ khỏi
  // nguồn). Trước đây transfer-order-items/merge-orders gọi save() 2 lần rời
  // nhau (2 transaction riêng) — nếu crash giữa 2 lần, món bị nhân đôi (đã
  // cộng vào đích, chưa trừ khỏi nguồn). Giữ nguyên thứ tự orders truyền vào
  // ở mảng trả về.
  async saveMany([first, second]: [Order, Order]): Promise<[Order, Order]> {
    return db.transaction(async (tx) => {
      const savedFirst = await saveOrderTx(tx, first);
      const savedSecond = await saveOrderTx(tx, second);
      return [savedFirst, savedSecond];
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

  async softDeleteOrder(id: number): Promise<void> {
    await db.update(order).set({ deletedAt: new Date() }).where(eq(order.id, id));
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
      .where(and(eq(order.status, "open"), isNull(order.deletedAt)))
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
      .where(and(eq(order.shiftId, shiftId), eq(order.status, "paid"), isNull(order.deletedAt)));
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
      .where(and(eq(order.shiftId, shiftId), isNull(order.deletedAt)))
      .groupBy(order.status);

    const byStatus = new Map(rows.map((r) => [r.status, r]));

    // Không dùng byStatus.get("open")?.revenue (tính từ order.totalAmount) vì
    // cột này null tới khi printBill()/confirmPayment() chạy — đơn open chưa
    // từng in sẽ bị tính thiếu. Tính "sống" từ orderItem, giống listActive().
    const [openRevenueRow] = await db
      .select({
        openRevenue: sql<number>`coalesce(sum(${orderItem.unitPrice} * ${orderItem.quantity}), 0)`.mapWith(
          Number,
        ),
      })
      .from(order)
      .leftJoin(orderItem, eq(orderItem.orderId, order.id))
      .where(and(eq(order.shiftId, shiftId), eq(order.status, "open"), isNull(order.deletedAt)));

    return {
      totalRevenue: byStatus.get("paid")?.revenue ?? 0,
      paidOrderCount: byStatus.get("paid")?.orderCount ?? 0,
      openOrderCount: byStatus.get("open")?.orderCount ?? 0,
      cancelledOrderCount: byStatus.get("cancelled")?.orderCount ?? 0,
      openRevenue: openRevenueRow?.openRevenue ?? 0,
    };
  },

  async getRevenueByShift(shiftIds: number[]): Promise<ShiftRevenueRow[]> {
    if (shiftIds.length === 0) return [];
    // Nhóm thêm theo paymentMethod (ngoài shiftId/status) để tách được doanh
    // thu tiền mặt/chuyển khoản theo từng ca cho biểu đồ Báo cáo — 1 ca "paid"
    // giờ có thể ra 2 dòng (1 cho mỗi phương thức), cộng dồn bằng += thay vì =.
    const [rows, grossRows] = await Promise.all([
      db
        .select({
          shiftId: order.shiftId,
          status: order.status,
          paymentMethod: order.paymentMethod,
          orderCount: count(),
          revenue: sql<number>`coalesce(sum(${order.totalAmount}), 0)`.mapWith(Number),
        })
        .from(order)
        .where(and(inArray(order.shiftId, shiftIds), isNull(order.deletedAt)))
        .groupBy(order.shiftId, order.status, order.paymentMethod),
      // Tổng tiền món TRƯỚC giảm giá — cần join order_items riêng vì
      // orders.total_amount đã là số SAU giảm giá, không suy ra gross được
      // nếu chỉ đọc bảng orders.
      db
        .select({
          shiftId: order.shiftId,
          grossRevenue: sql<number>`coalesce(sum(${orderItem.unitPrice} * ${orderItem.quantity}), 0)`.mapWith(
            Number,
          ),
        })
        .from(orderItem)
        .innerJoin(order, eq(order.id, orderItem.orderId))
        .where(and(inArray(order.shiftId, shiftIds), eq(order.status, "paid"), isNull(order.deletedAt)))
        .groupBy(order.shiftId),
    ]);

    const byShift = new Map<number, ShiftRevenueRow>(
      shiftIds.map((id) => [
        id,
        {
          shiftId: id,
          totalRevenue: 0,
          paidOrderCount: 0,
          cancelledOrderCount: 0,
          cashRevenue: 0,
          transferRevenue: 0,
          grossRevenue: 0,
          discountAmount: 0,
        },
      ]),
    );
    for (const row of rows) {
      if (row.shiftId === null) continue;
      const entry = byShift.get(row.shiftId);
      if (!entry) continue;
      if (row.status === "paid") {
        entry.totalRevenue += row.revenue;
        entry.paidOrderCount += row.orderCount;
        if (row.paymentMethod === "cash") entry.cashRevenue += row.revenue;
        else if (row.paymentMethod === "transfer") entry.transferRevenue += row.revenue;
      } else if (row.status === "cancelled") {
        entry.cancelledOrderCount += row.orderCount;
      }
    }
    for (const row of grossRows) {
      if (row.shiftId === null) continue;
      const entry = byShift.get(row.shiftId);
      if (!entry) continue;
      entry.grossRevenue = row.grossRevenue;
    }
    for (const entry of byShift.values()) {
      entry.discountAmount = Math.max(0, entry.grossRevenue - entry.totalRevenue);
    }
    return Array.from(byShift.values());
  },

  async getTopSellingItems(
    shiftIds: number[],
    limit: number,
    categoryIds?: number[],
  ): Promise<TopSellingItem[]> {
    if (shiftIds.length === 0) return [];
    const conditions = [inArray(order.shiftId, shiftIds), eq(order.status, "paid"), isNull(order.deletedAt)];
    if (categoryIds && categoryIds.length > 0) {
      conditions.push(inArray(menuItem.categoryId, categoryIds));
    }
    const rows = await db
      .select({
        menuItemId: orderItem.menuItemId,
        itemName: orderItem.itemName,
        quantitySold: sql<number>`coalesce(sum(${orderItem.quantity}), 0)`.mapWith(Number),
        revenue: sql<number>`coalesce(sum(${orderItem.unitPrice} * ${orderItem.quantity}), 0)`.mapWith(Number),
      })
      .from(orderItem)
      .innerJoin(order, eq(order.id, orderItem.orderId))
      .innerJoin(menuItem, eq(menuItem.id, orderItem.menuItemId))
      .where(and(...conditions))
      .groupBy(orderItem.menuItemId, orderItem.itemName)
      .orderBy(desc(sql`sum(${orderItem.quantity})`))
      .limit(limit);
    return rows;
  },

  async getRevenueByPaymentMethod(shiftIds: number[]): Promise<PaymentMethodRevenue[]> {
    if (shiftIds.length === 0) return [];
    const rows = await db
      .select({
        paymentMethod: order.paymentMethod,
        revenue: sql<number>`coalesce(sum(${order.totalAmount}), 0)`.mapWith(Number),
        orderCount: count(),
      })
      .from(order)
      .where(and(inArray(order.shiftId, shiftIds), eq(order.status, "paid"), isNull(order.deletedAt)))
      .groupBy(order.paymentMethod);
    return rows
      .filter((row): row is typeof row & { paymentMethod: NonNullable<typeof row.paymentMethod> } =>
        row.paymentMethod !== null,
      )
      .map((row) => ({ paymentMethod: row.paymentMethod, revenue: row.revenue, orderCount: row.orderCount }));
  },

  async getPromotionUsage(shiftIds: number[]): Promise<PromotionUsageRow[]> {
    if (shiftIds.length === 0) return [];
    const paidOrders = await db
      .select({
        id: order.id,
        promotionId: order.promotionId,
        promotionName: order.promotionName,
        totalAmount: order.totalAmount,
      })
      .from(order)
      .where(
        and(
          inArray(order.shiftId, shiftIds),
          eq(order.status, "paid"),
          isNotNull(order.promotionId),
          isNull(order.deletedAt),
        ),
      );
    if (paidOrders.length === 0) return [];

    const orderIds = paidOrders.map((o) => o.id);
    const subtotalRows = await db
      .select({
        orderId: orderItem.orderId,
        subtotal: sql<number>`coalesce(sum(${orderItem.unitPrice} * ${orderItem.quantity}), 0)`.mapWith(Number),
      })
      .from(orderItem)
      .where(inArray(orderItem.orderId, orderIds))
      .groupBy(orderItem.orderId);
    const subtotalByOrderId = new Map(subtotalRows.map((r) => [r.orderId, r.subtotal]));

    const byPromotion = new Map<number, PromotionUsageRow>();
    for (const o of paidOrders) {
      if (o.promotionId === null) continue;
      const subtotal = subtotalByOrderId.get(o.id) ?? 0;
      const discount = Math.max(0, subtotal - (o.totalAmount ?? 0));
      const entry = byPromotion.get(o.promotionId) ?? {
        promotionId: o.promotionId,
        promotionName: o.promotionName ?? "",
        orderCount: 0,
        totalDiscount: 0,
      };
      entry.orderCount += 1;
      entry.totalDiscount += discount;
      byPromotion.set(o.promotionId, entry);
    }
    return Array.from(byPromotion.values()).sort((a, b) => b.totalDiscount - a.totalDiscount);
  },

  async getRevenueByCategory(shiftIds: number[], categoryIds?: number[]): Promise<CategoryRevenue[]> {
    if (shiftIds.length === 0) return [];
    const conditions = [inArray(order.shiftId, shiftIds), eq(order.status, "paid"), isNull(order.deletedAt)];
    if (categoryIds && categoryIds.length > 0) {
      conditions.push(inArray(category.id, categoryIds));
    }
    const rows = await db
      .select({
        categoryId: category.id,
        categoryName: category.name,
        revenue: sql<number>`coalesce(sum(${orderItem.unitPrice} * ${orderItem.quantity}), 0)`.mapWith(Number),
      })
      .from(orderItem)
      .innerJoin(order, eq(order.id, orderItem.orderId))
      .innerJoin(menuItem, eq(menuItem.id, orderItem.menuItemId))
      .innerJoin(category, eq(category.id, menuItem.categoryId))
      .where(and(...conditions))
      .groupBy(category.id, category.name)
      .orderBy(desc(sql`sum(${orderItem.unitPrice} * ${orderItem.quantity})`));
    return rows;
  },

  async listOrderItemEvents({
    page,
    pageSize,
    search,
    actorId,
    shiftId,
  }: ListOrderItemEventsParams): Promise<ListOrderItemEventsResult> {
    const offset = (page - 1) * pageSize;
    const trimmedSearch = search?.trim();
    const conditions = [
      inArray(orderEvent.eventType, ["items_added", "items_removed"]),
      eq(order.shiftId, shiftId),
    ];
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
      db
        .select({ value: count() })
        .from(orderEvent)
        .innerJoin(order, eq(orderEvent.orderId, order.id))
        .where(where),
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
    shiftId,
  }: ListTableTransferEventsParams): Promise<ListTableTransferEventsResult> {
    const offset = (page - 1) * pageSize;
    const conditions = [
      inArray(orderEvent.eventType, ["table_changed", "items_transferred_out"]),
      eq(order.shiftId, shiftId),
    ];
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
      db
        .select({ value: count() })
        .from(orderEvent)
        .innerJoin(order, eq(orderEvent.orderId, order.id))
        .where(where),
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
