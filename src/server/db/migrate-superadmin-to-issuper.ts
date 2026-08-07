import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { user } from "~/server/better-auth/schema";

/**
 * Migrate 1 lần cho user cũ còn `role = 'superadmin'` — role này đã bị bỏ
 * hẳn khỏi hệ thống (thay bằng `user.isSuper`, cờ giám sát ẩn tuyệt đối,
 * xem CLAUDE.md). Chạy tay lúc deploy (không tự động chạy vì hệ thống đang
 * live thật) — chuyển các user này sang `role = 'admin'` (giữ đủ quyền quản
 * lý bình thường) + `isSuper = true` (giữ nguyên các quyền giám sát ẩn cũ:
 * Nhật ký hoạt động, Lịch sử chat AI toàn cục, xoá đơn hàng).
 */
async function migrateSuperadminToIsSuper() {
  const rows = await db
    .update(user)
    .set({ role: "admin", isSuper: true })
    .where(eq(user.role, "superadmin"))
    .returning({ id: user.id, name: user.name });

  if (rows.length === 0) {
    console.log("Không có user nào còn role 'superadmin' — không cần migrate.");
    return;
  }
  for (const row of rows) {
    console.log(`  ${row.name} (${row.id}): superadmin -> admin + isSuper=true`);
  }
  console.log(`Đã migrate ${rows.length} user.`);
}

migrateSuperadminToIsSuper()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Lỗi khi migrate superadmin -> isSuper:", error);
    process.exit(1);
  });
