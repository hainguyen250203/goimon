import "dotenv/config";

import { sql } from "drizzle-orm";

import { db } from "~/server/db";

// drizzle-kit push chỉ quản lý bảng/index khai báo trong schema TS, không
// quản lý Postgres extension — nên phải cài riêng, chạy 1 lần cho mỗi môi
// trường (idempotent nhờ IF NOT EXISTS). Dùng cho tìm kiếm không dấu server-
// side ở order.listItemHistory (unaccent(item_name) ilike unaccent(search)).
async function ensureExtensions() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS unaccent`);
  console.log("Đã đảm bảo extension unaccent.");
}

ensureExtensions()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Lỗi khi cài extension:", error);
    process.exit(1);
  });
