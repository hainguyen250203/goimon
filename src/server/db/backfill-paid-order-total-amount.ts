import "dotenv/config";

import { sql } from "drizzle-orm";

import { db } from "~/server/db";

/**
 * Backfill 1 lần cho các đơn ĐÃ THANH TOÁN từ trước khi confirmPayment()
 * (order.entity.ts) được sửa để tự chốt totalAmount — trước đó chỉ
 * printBill() mới set totalAmount, nên đơn thanh toán mà chưa từng in có
 * totalAmount NULL vĩnh viễn, làm mọi query sum(totalAmount) tính doanh thu
 * âm thầm bỏ qua đơn đó (SQL SUM bỏ qua NULL) → ra 0đ dù đơn đã thanh toán
 * thật. orderItem đã bị khoá (assertMutable) từ lúc đơn hết "open" nên tính
 * lại từ orderItem hiện tại cho ra đúng số tiền đã thu — công thức giống hệt
 * getter discountAmount/payableAmount của Order entity. Idempotent: chỉ động
 * tới đơn total_amount đang NULL.
 */
async function backfillPaidOrderTotalAmount() {
  const result = await db.execute(sql`
    WITH subtotals AS (
      SELECT order_id, SUM(unit_price * quantity) AS subtotal
      FROM order_items
      GROUP BY order_id
    )
    UPDATE orders o
    SET total_amount = GREATEST(
      COALESCE(s.subtotal, 0) - CASE
        WHEN o.promotion_discount_type = 'percent'
          THEN LEAST(ROUND(COALESCE(s.subtotal, 0) * o.promotion_discount_value / 100.0), COALESCE(s.subtotal, 0))
        WHEN o.promotion_discount_type = 'fixed'
          THEN LEAST(o.promotion_discount_value, COALESCE(s.subtotal, 0))
        ELSE 0
      END,
      0
    )
    FROM subtotals s
    WHERE o.id = s.order_id
      AND o.status = 'paid'
      AND o.total_amount IS NULL
  `);
  console.log(`Đã backfill total_amount cho ${result.count ?? 0} đơn đã thanh toán.`);
}

backfillPaidOrderTotalAmount()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Lỗi khi backfill total_amount:", error);
    process.exit(1);
  });
