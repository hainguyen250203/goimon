import "dotenv/config";

import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { paymentConfig } from "~/modules/payment-config/infrastructure/payment-config.schema";
import { printer } from "~/modules/printer/infrastructure/printer.schema";
import { area, restaurantTable } from "~/modules/table/infrastructure/table.schema";
import { auth } from "~/server/better-auth/config";
import { account } from "~/server/better-auth/schema";
import { db } from "~/server/db";

type UserRole = "user" | "manager" | "admin" | "superadmin";

// Mỗi tài khoản mật khẩu trùng số điện thoại riêng của mình (không dùng mật
// khẩu chung) để không tạo tài khoản demo thừa/dễ đoán trên môi trường không
// phải local dev.
const SEED_USERS = [
  { name: "Nguyen Hai", phoneNumber: "0968916540", password: "$2b$10$sFZStD2cIe.LqELq6Yxhj.cDAAfi2mDndKJ7kvhG32ygje8mvmZza", role: "superadmin" as const },
];

type SeedUserFileEntry = {
  full_name: string;
  phone: string;
  password: string;
  role: string;
};

// Số di động VN hợp lệ: 10 số, bắt đầu 0, đầu số 03/05/07/08/09 — user.json
// là data export cũ lẫn nhiều SĐT rác ("1", "2", "34", "123"...), phải lọc bỏ
// trước khi seed thay vì insert thẳng.
const VALID_PHONE_REGEX = /^0[35789]\d{8}$/;

// user.json không có role "employee" trong hệ thống hiện tại (chỉ
// user/manager/admin/superadmin) — coi "employee" và mọi giá trị lạ khác là
// role thấp nhất "user".
function mapFileRole(role: string): UserRole {
  return role === "admin" || role === "manager" || role === "superadmin"
    ? role
    : "user";
}

// Khu A..Khu I (20 bàn/khu, tên "Khu A - B1"..) + Mang về (4 bàn đại diện cho
// khách chờ mang đi, không cần đánh số nhiều như khu ngồi tại chỗ).
const SEED_LAYOUT = [
  ...Array.from({ length: 9 }, (_, i) => {
    const areaName = `Khu ${String.fromCharCode(65 + i)}`; // A, B, C... I
    return { areaName, tablePrefix: areaName, tableCount: 20 };
  }),
  { areaName: "Mang về", tablePrefix: "MV", tableCount: 4 },
];

/**
 * `seedUser.password` ở đây đã là HASH bcrypt tính sẵn (không phải plaintext)
 * — `auth.api.createUser` không có cách nào nhận thẳng 1 hash có sẵn (luôn tự
 * hash lại chuỗi truyền vào), nên phải tạo user với 1 password ngẫu nhiên
 * (không dùng tới) rồi ghi ĐÈ thẳng cột `accounts.password` bằng Drizzle —
 * tránh hash chồng lần nữa lên 1 giá trị vốn đã là hash. Idempotent theo SĐT:
 * user đã tồn tại thì chỉ ghi đè lại mật khẩu (không tạo trùng), user chưa có
 * thì tạo mới.
 */
async function upsertSeedUser(seedUser: {
  name: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
}) {
  const existing = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.phoneNumber, seedUser.phoneNumber),
  });
  if (existing) {
    await db
      .update(account)
      .set({ password: seedUser.password })
      .where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")));
    console.log(`  ghi đè mật khẩu user ${seedUser.name} (đã tồn tại)`);
    return;
  }

  const created = await auth.api.createUser({
    body: {
      email: `${seedUser.phoneNumber}@pos.internal`,
      password: randomUUID(),
      name: seedUser.name,
      role: seedUser.role,
      data: {
        phoneNumber: seedUser.phoneNumber,
        phoneNumberVerified: true,
      },
    },
  });

  await db
    .update(account)
    .set({ password: seedUser.password })
    .where(and(eq(account.userId, created.user.id), eq(account.providerId, "credential")));

  console.log(
    `  tạo user ${seedUser.name} (${seedUser.phoneNumber}, role=${seedUser.role})`,
  );
}

async function seedUsers() {
  for (const seedUser of SEED_USERS) {
    await upsertSeedUser(seedUser);
  }
}

/**
 * Nguồn bổ sung từ `seed-data/user.json` (data export cũ) — merge thêm bên
 * cạnh SEED_USERS ở trên. SĐT không hợp lệ bị bỏ qua; SĐT trùng với user đã
 * tồn tại (kể cả trùng với SEED_USERS) được `upsertSeedUser` ghi đè lại mật
 * khẩu theo giá trị trong file này, không tạo trùng.
 */
async function seedUsersFromFile() {
  const filePath = path.join(
    process.cwd(),
    "src/server/db/seed-data/user.json",
  );
  const entries = JSON.parse(
    readFileSync(filePath, "utf-8"),
  ) as SeedUserFileEntry[];

  for (const entry of entries) {
    if (!VALID_PHONE_REGEX.test(entry.phone)) {
      console.log(
        `  bỏ qua "${entry.full_name.trim()}" (SĐT không hợp lệ: "${entry.phone}")`,
      );
      continue;
    }

    await upsertSeedUser({
      name: entry.full_name.trim(),
      phoneNumber: entry.phone,
      password: entry.password,
      role: mapFileRole(entry.role),
    });
  }
}

async function findOrCreateArea(name: string) {
  const existing = await db.query.area.findFirst({
    where: (a, { eq }) => eq(a.name, name),
  });
  if (existing) return existing;
  const [created] = await db.insert(area).values({ name }).returning();
  if (!created) throw new Error(`Không tạo được area ${name}`);
  return created;
}

async function seedAreasAndTables() {
  for (const { areaName, tablePrefix, tableCount } of SEED_LAYOUT) {
    const areaRow = await findOrCreateArea(areaName);

    for (let i = 1; i <= tableCount; i++) {
      const tableName = `${tablePrefix} - B${i}`;
      const existing = await db.query.restaurantTable.findFirst({
        where: (t, { eq }) => eq(t.name, tableName),
      });
      if (existing) continue;

      await db
        .insert(restaurantTable)
        .values({ areaId: areaRow.id, name: tableName });
    }
    console.log(`  ${areaName}: ${tableCount} bàn`);
  }
}

async function seedPrinters() {
  const existing = await db.query.printer.findFirst();
  if (existing) {
    console.log("  printer đã có dữ liệu, bỏ qua");
    return;
  }
  await db.insert(printer).values({
    name: "Máy in quầy thu ngân",
    ipAddress: "192.168.1.100",
    port: 9100,
  });
}

/** Chỉ 1 dòng duy nhất trong bảng này (xem payment-config.schema.ts) — bỏ qua nếu đã có. */
async function seedPaymentConfig() {
  const existing = await db.query.paymentConfig.findFirst();
  if (existing) {
    console.log("  payment_config đã có dữ liệu, bỏ qua");
    return;
  }
  await db.insert(paymentConfig).values({
    bankCode: "ACB",
    bankAccountNumber: "48188847",
    bankAccountName: "HKD NHA DAU 3 NI",
  });
}

async function main() {
  console.log("Seeding users...");
  await seedUsers();

  console.log("Seeding users from seed-data/user.json...");
  await seedUsersFromFile();

  console.log("Seeding areas & tables...");
  await seedAreasAndTables();

  console.log("Seeding printers...");
  await seedPrinters();

  console.log("Seeding payment config...");
  await seedPaymentConfig();

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
