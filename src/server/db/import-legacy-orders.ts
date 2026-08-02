import "dotenv/config";

import { readFileSync } from "node:fs";
import path from "node:path";

import { category, menuItem } from "~/modules/menu/infrastructure/menu.schema";
import { order, orderEvent, orderItem } from "~/modules/order/infrastructure/order.schema";
import { shift } from "~/modules/shift/infrastructure/shift.schema";
import { db } from "~/server/db";

/**
 * Seed menu THẬT từ "quán cũ" (pos-be, MySQL) + import đơn hàng của CA GẦN
 * NHẤT vào pos-system. Chạy SAU `db:migrate` + `db:seed` (cần sẵn user admin
 * + bàn thật). Không còn khái niệm "[Quán cũ]" ẩn — category/menu_item import
 * ra chính là menu thật đang dùng, order gắn vào 1 bàn thật + 1 shift mới
 * tạo, không tạo area/table riêng cho quán cũ nữa.
 *
 * Phạm vi (đã chốt với người yêu cầu):
 * - Chỉ cần thống kê — mọi actor (createdBy/actorId/openedBy/closedBy) gán
 *   cứng về 1 admin có sẵn (`ADMIN_PHONE_NUMBER`), KHÔNG migrate user/mật
 *   khẩu thật.
 * - Mọi đơn import đều gắn `tableId` vào ĐÚNG 1 bàn thật có sẵn
 *   (`FIXED_TABLE_NAME`) — quán cũ dùng bàn nào không còn ý nghĩa với quán
 *   hiện tại, chỉ cần đúng doanh thu/số liệu.
 * - Đơn cũ còn `status="open"` (giỏ hàng bỏ dở) hoặc `status="billed"` mà
 *   `bill` không có kết quả rõ ràng (khác "paid") đều BỎ QUA, không import.
 * - order_events chỉ tự sinh 2 loại, đúng eventType thật đang dùng trong
 *   order.router.ts: "items_added" (lúc tạo đơn) và "payment_confirmed"
 *   (lúc thanh toán, nếu có) — không phục dựng lại toàn bộ loghistory cũ.
 * - Mọi timestamp export từ MySQL đều KHÔNG có timezone — server MySQL (container
 *   MariaDB local dùng để test) chạy hệ điều hành UTC (`/etc/localtime ->
 *   Etc/UTC`, tự kiểm bằng `docker exec ... mysql -e "SELECT NOW(),
 *   UTC_TIMESTAMP()"` ra 2 giá trị BẰNG NHAU), nên chuỗi export chính là giờ
 *   UTC, parse thẳng KHÔNG trừ/cộng offset gì thêm (xem `parseLegacyDateTime`).
 *   Nếu sau này export từ 1 MySQL server khác cấu hình theo giờ VN thay vì
 *   UTC, phải tự kiểm tra lại theo đúng cách trên rồi sửa hàm này cho khớp.
 */
const ADMIN_PHONE_NUMBER = "0397372410";
/** Bàn thật (đã có sẵn sau `db:seed`) dùng chung cho mọi đơn import. */
const FIXED_TABLE_NAME = "Khu A - B1";
const LEGACY_DATA_DIR = path.join(process.cwd(), "src/server/db/seed-data/legacy");

// ---- Kiểu dữ liệu export từ pos-be (MySQL) — xem pos-be/prisma/schema.prisma ----
type LegacyCategory = { id: number; name: string };
type LegacyProduct = { id: number; name: string; price: number; category_id: number };
type LegacyShift = { id: number; start_time: string; end_time: string | null; status: "open" | "closed" };
type LegacyOrder = {
  id: number;
  table_id: number;
  shift_id: number;
  status: "open" | "billed" | "cancelled";
  note: string | null;
  is_deleted: number;
  created_at: string;
  updated_at: string;
};
type LegacyOrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  note: string | null;
  is_deleted: number;
  created_at: string;
};
type LegacyBill = {
  order_id: number;
  total_amount: number;
  payment_method: "cash" | "bank" | null;
  status: "unpaid" | "paid" | "cancelled";
  paid_at: string | null;
  updated_at: string;
};

function readLegacyJson<T>(fileName: string): T[] {
  const filePath = path.join(LEGACY_DATA_DIR, fileName);
  return JSON.parse(readFileSync(filePath, "utf-8")) as T[];
}

/** MySQL export "YYYY-MM-DD HH:MM:SS.mmm" — không có timezone, server MySQL nguồn
 * chạy UTC nên chuỗi này CHÍNH LÀ giờ UTC, parse thẳng không lệch offset gì. */
function parseLegacyDateTime(value: string): Date {
  const [datePart, timePart] = value.split(" ");
  const [y, m, d] = datePart!.split("-").map(Number);
  const [hh, mm, ssRaw] = (timePart ?? "00:00:00").split(":");
  const [ss, ms] = (ssRaw ?? "0").split(".");
  return new Date(
    Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, Number(hh) || 0, Number(mm) || 0, Number(ss) || 0, Number(ms ?? 0)),
  );
}

/** Chỉ seed 1 lần — nếu đã có category nào rồi (kể cả tạo tay qua UI) thì chặn luôn, tránh seed trùng. */
async function assertNotAlreadySeeded() {
  const existing = await db.query.category.findFirst();
  if (existing) {
    throw new Error(
      'Đã có category trong DB — script này chỉ chạy khi menu đang TRỐNG (vừa "db:migrate" + "db:seed" xong). ' +
        "Nếu chắc chắn muốn seed lại, xoá dữ liệu category/menu_item/order liên quan trước khi chạy lại.",
    );
  }
}

async function getAdminUserId(): Promise<string> {
  const admin = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.phoneNumber, ADMIN_PHONE_NUMBER),
  });
  if (!admin) {
    throw new Error(`Không tìm thấy user với SĐT ${ADMIN_PHONE_NUMBER} — chạy "db:seed" trước khi chạy script này.`);
  }
  return admin.id;
}

async function getFixedTableId(): Promise<number> {
  const table = await db.query.restaurantTable.findFirst({
    where: (t, { eq }) => eq(t.name, FIXED_TABLE_NAME),
  });
  if (!table) {
    throw new Error(`Không tìm thấy bàn "${FIXED_TABLE_NAME}" — chạy "db:seed" trước khi chạy script này.`);
  }
  return table.id;
}

/** Ca gần nhất (start_time mới nhất) trong dữ liệu cũ. */
function pickLatestShift(shifts: LegacyShift[]): LegacyShift {
  if (shifts.length === 0) throw new Error("shift.json rỗng — không xác định được ca gần nhất.");
  const latest = [...shifts].sort(
    (a, b) => parseLegacyDateTime(b.start_time).getTime() - parseLegacyDateTime(a.start_time).getTime(),
  )[0]!;
  console.log(`  ca gần nhất: id=${latest.id}, start_time=${latest.start_time}, status=${latest.status}`);
  return latest;
}

/** Tạo mới đúng 1 shift trong pos-system đại diện cho ca gần nhất — luôn
 * "closed" (dữ liệu lịch sử), không phụ thuộc status gốc bên pos-be. */
async function importLatestShift(latestShift: LegacyShift, adminId: string): Promise<number> {
  const startTime = parseLegacyDateTime(latestShift.start_time);
  const endTime = latestShift.end_time ? parseLegacyDateTime(latestShift.end_time) : startTime;
  const [created] = await db
    .insert(shift)
    .values({ openedBy: adminId, closedBy: adminId, status: "closed", startTime, endTime })
    .returning();
  if (!created) throw new Error("Không tạo được shift cho ca gần nhất.");
  console.log(`  đã tạo shift mới id=${created.id}`);
  return created.id;
}

async function importCategories(rows: LegacyCategory[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for (const row of rows) {
    const [created] = await db.insert(category).values({ name: row.name }).returning();
    if (created) map.set(row.id, created.id);
  }
  console.log(`  ${map.size} danh mục`);
  return map;
}

async function importProducts(
  rows: LegacyProduct[],
  categoryIdMap: Map<number, number>,
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for (const row of rows) {
    const categoryId = categoryIdMap.get(row.category_id);
    if (!categoryId) {
      console.warn(`  bỏ qua món "${row.name}" (id=${row.id}) — không tìm thấy danh mục gốc id=${row.category_id}`);
      continue;
    }
    const [created] = await db
      .insert(menuItem)
      .values({ categoryId, name: row.name, price: row.price })
      .returning();
    if (created) map.set(row.id, created.id);
  }
  console.log(`  ${map.size} món`);
  return map;
}

/** Fallback cho order_item trỏ tới product_id không có trong product.json export (hiếm khi xảy ra). */
async function ensureFallbackMenuItem(): Promise<number> {
  const [categoryRow] = await db.insert(category).values({ name: "Khác" }).returning();
  if (!categoryRow) throw new Error("Không tạo được danh mục fallback.");

  const [created] = await db
    .insert(menuItem)
    .values({ categoryId: categoryRow.id, name: "Món không xác định", price: 0 })
    .returning();
  if (!created) throw new Error("Không tạo được món fallback.");
  return created.id;
}

async function importOrders({
  orders,
  bills,
  tableId,
  shiftId,
  adminId,
}: {
  orders: LegacyOrder[];
  bills: LegacyBill[];
  tableId: number;
  shiftId: number;
  adminId: string;
}): Promise<Map<number, number>> {
  const billByOrderId = new Map(bills.map((b) => [b.order_id, b]));
  const map = new Map<number, number>();
  let skippedOpen = 0;
  let skippedNoResult = 0;

  for (const row of orders) {
    if (row.status === "open") {
      skippedOpen++;
      continue;
    }

    let status: "paid" | "cancelled";
    let totalAmount: number | null = null;
    let paymentMethod: "cash" | "transfer" | null = null;
    let paidConfirmedAt: Date | null = null;

    if (row.status === "cancelled") {
      status = "cancelled";
    } else {
      // row.status === "billed" — chỉ import tiếp nếu bill có kết quả rõ ràng "paid".
      const bill = billByOrderId.get(row.id);
      if (!bill || bill.status !== "paid") {
        skippedNoResult++;
        continue;
      }
      status = "paid";
      totalAmount = bill.total_amount;
      paymentMethod = bill.payment_method === "bank" ? "transfer" : "cash";
      paidConfirmedAt = parseLegacyDateTime(bill.paid_at ?? bill.updated_at);
    }

    const [created] = await db
      .insert(order)
      .values({
        tableId,
        shiftId,
        status,
        note: row.note,
        createdBy: adminId,
        totalAmount,
        paymentMethod,
        paidConfirmedBy: status === "paid" ? adminId : null,
        paidConfirmedAt,
        createdAt: parseLegacyDateTime(row.created_at),
        updatedAt: parseLegacyDateTime(row.updated_at),
        deletedAt: row.is_deleted ? parseLegacyDateTime(row.updated_at) : null,
      })
      .returning();
    if (created) map.set(row.id, created.id);
  }

  console.log(
    `  ${map.size} đơn import — bỏ qua ${skippedOpen} đơn "open", ${skippedNoResult} đơn "billed" chưa có kết quả rõ ràng`,
  );
  return map;
}

async function importOrderItemsAndEvents({
  orderItems,
  orderIdMap,
  productIdMap,
  productNameById,
  fallbackMenuItemId,
  adminId,
  ordersById,
}: {
  orderItems: LegacyOrderItem[];
  orderIdMap: Map<number, number>;
  productIdMap: Map<number, number>;
  /** `orderitem` (pos-be) KHÔNG snapshot tên món (khác `billitem.product_name`,
   * bảng ta không dùng) — phải tra tên hiện có của `product` tại thời điểm export. */
  productNameById: Map<number, string>;
  fallbackMenuItemId: number;
  adminId: string;
  ordersById: Map<number, LegacyOrder>;
}) {
  const itemsByOrderId = new Map<number, LegacyOrderItem[]>();
  for (const item of orderItems) {
    if (item.is_deleted) continue; // order_items pos-system không có soft-delete — món đã gỡ trước khi chốt thì bỏ qua luôn.
    if (!orderIdMap.has(item.order_id)) continue; // đơn không được import (open/không rõ kết quả) thì item cũng bỏ qua.
    const list = itemsByOrderId.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrderId.set(item.order_id, list);
  }

  let itemCount = 0;
  for (const [legacyOrderId, items] of itemsByOrderId) {
    const newOrderId = orderIdMap.get(legacyOrderId)!;
    const legacyOrder = ordersById.get(legacyOrderId)!;

    const resolvedItems = items.map((item) => ({
      menuItemId: productIdMap.get(item.product_id) ?? fallbackMenuItemId,
      itemName: productNameById.get(item.product_id) ?? "Món không xác định",
      unitPrice: item.unit_price,
      quantity: item.quantity,
      note: item.note,
      createdAt: parseLegacyDateTime(item.created_at),
    }));

    await db.insert(orderItem).values(
      resolvedItems.map((item) => ({
        orderId: newOrderId,
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        note: item.note,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      })),
    );
    itemCount += resolvedItems.length;

    // items_added — mốc thời gian tạo đơn.
    await db.insert(orderEvent).values({
      orderId: newOrderId,
      actorId: adminId,
      eventType: "items_added",
      payload: {
        items: resolvedItems.map((item) => ({
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          note: item.note,
        })),
      },
      createdAt: parseLegacyDateTime(legacyOrder.created_at),
    });
  }
  console.log(`  ${itemCount} order_items, ${itemsByOrderId.size} event "items_added"`);
}

async function main() {
  await assertNotAlreadySeeded();
  const adminId = await getAdminUserId();
  const tableId = await getFixedTableId();

  console.log("Đọc file export...");
  const legacyCategories = readLegacyJson<LegacyCategory>("category.json");
  const legacyProducts = readLegacyJson<LegacyProduct>("product.json");
  const legacyShifts = readLegacyJson<LegacyShift>("shift.json");
  const legacyOrdersAll = readLegacyJson<LegacyOrder>("order.json");
  const legacyOrderItems = readLegacyJson<LegacyOrderItem>("orderitem.json");
  const legacyBills = readLegacyJson<LegacyBill>("bill.json");

  console.log("Xác định ca gần nhất...");
  const latestShift = pickLatestShift(legacyShifts);
  const legacyOrders = legacyOrdersAll.filter((o) => o.shift_id === latestShift.id);
  console.log(`  ${legacyOrders.length}/${legacyOrdersAll.length} đơn thuộc ca gần nhất`);

  console.log("Tạo shift mới cho ca gần nhất...");
  const shiftId = await importLatestShift(latestShift, adminId);

  console.log("Seed danh mục...");
  const categoryIdMap = await importCategories(legacyCategories);

  console.log("Seed món...");
  const productIdMap = await importProducts(legacyProducts, categoryIdMap);
  const fallbackMenuItemId = await ensureFallbackMenuItem();

  console.log("Import đơn hàng...");
  const orderIdMap = await importOrders({
    orders: legacyOrders,
    bills: legacyBills,
    tableId,
    shiftId,
    adminId,
  });

  console.log("Import order_items + order_events...");
  await importOrderItemsAndEvents({
    orderItems: legacyOrderItems,
    orderIdMap,
    productIdMap,
    productNameById: new Map(legacyProducts.map((p) => [p.id, p.name])),
    fallbackMenuItemId,
    adminId,
    ordersById: new Map(legacyOrders.map((o) => [o.id, o])),
  });

  console.log("Import event payment_confirmed cho đơn đã thanh toán...");
  const billByOrderId = new Map(legacyBills.map((b) => [b.order_id, b]));
  let paidEventCount = 0;
  for (const [legacyOrderId, newOrderId] of orderIdMap) {
    const bill = billByOrderId.get(legacyOrderId);
    if (!bill || bill.status !== "paid") continue;
    await db.insert(orderEvent).values({
      orderId: newOrderId,
      actorId: adminId,
      eventType: "payment_confirmed",
      payload: {
        paymentMethod: bill.payment_method === "bank" ? "transfer" : "cash",
        totalAmount: bill.total_amount,
      },
      createdAt: parseLegacyDateTime(bill.paid_at ?? bill.updated_at),
    });
    paidEventCount++;
  }
  console.log(`  ${paidEventCount} event "payment_confirmed"`);

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
