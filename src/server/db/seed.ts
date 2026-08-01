import "dotenv/config";

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";

import { category, menuItem } from "~/modules/menu/infrastructure/menu.schema";
import { paymentConfig } from "~/modules/payment-config/infrastructure/payment-config.schema";
import { printer } from "~/modules/printer/infrastructure/printer.schema";
import { area, restaurantTable } from "~/modules/table/infrastructure/table.schema";
import { account } from "~/server/better-auth/schema";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

// Dữ liệu tham khảo từ pos-be/src/utils/data/menu.json (chỉ lấy DATA, không
// copy code/logic seed của pos-be).
type SeedProduct = {
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  price: number;
};

type SeedCategory = {
  name: string;
  products: SeedProduct[];
};

// Mỗi tài khoản mật khẩu trùng số điện thoại riêng của mình (không dùng mật
// khẩu chung) để không tạo tài khoản demo thừa/dễ đoán trên môi trường không
// phải local dev.
const SEED_USERS = [
  { name: "Nguyen Hai", phoneNumber: "0968916540", password: "$2b$10$sFZStD2cIe.LqELq6Yxhj.cDAAfi2mDndKJ7kvhG32ygje8mvmZza", role: "superadmin" as const },
  { name: "Khanh Lam", phoneNumber: "0397372410", password: "$2b$10$XWTh0Z8NGNPbItEsA3g6heCsjDmWfcMzG5hq8v3nt1UCLtLyComXK", role: "admin" as const },
];

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
 * tránh hash chồng lần nữa lên 1 giá trị vốn đã là hash. Idempotent: bỏ qua
 * nếu đã tồn tại.
 */
async function seedUsers() {
  for (const seedUser of SEED_USERS) {
    const existing = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.phoneNumber, seedUser.phoneNumber),
    });
    if (existing) {
      console.log(`  bỏ qua user ${seedUser.name} (đã tồn tại)`);
      continue;
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

/** Chỉ seed 1 lần — nếu đã có category nào rồi thì bỏ qua toàn bộ. */
async function seedMenu() {
  const existingCategory = await db.query.category.findFirst();
  if (existingCategory) {
    console.log("  menu đã có dữ liệu, bỏ qua");
    return;
  }

  const menuPath = path.join(
    process.cwd(),
    "src/server/db/seed-data/menu.json",
  );
  const menuData = JSON.parse(readFileSync(menuPath, "utf-8")) as {
    categories: SeedCategory[];
  };

  for (const cat of menuData.categories) {
    const [categoryRow] = await db
      .insert(category)
      .values({ name: cat.name })
      .returning();
    if (!categoryRow) continue;

    const items = cat.products.map((p) => ({
      categoryId: categoryRow.id,
      name: p.name,
      price: p.price,
      isAvailable: p.is_active,
      isPublished: !p.is_deleted,
    }));

    if (items.length > 0) {
      await db.insert(menuItem).values(items);
    }
  }
  console.log(
    `  seeded ${menuData.categories.length} category, ${menuData.categories.reduce((n, c) => n + c.products.length, 0)} món`,
  );
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

  console.log("Seeding areas & tables...");
  await seedAreasAndTables();

  console.log("Seeding menu...");
  await seedMenu();

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
