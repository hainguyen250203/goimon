import "dotenv/config";

import { readFileSync } from "node:fs";
import path from "node:path";

import { category, menuItem } from "~/modules/menu/infrastructure/menu.schema";
import { printer } from "~/modules/printer/infrastructure/printer.schema";
import { area, restaurantTable } from "~/modules/table/infrastructure/table.schema";
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
  { name: "Nguyen Hai", phoneNumber: "0968916540", password: "0968916540", role: "superadmin" as const },
  { name: "Khanh Lam", phoneNumber: "0397372410", password: "0397372410", role: "admin" as const },
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
 * Tạo user qua `auth.api.createUser` (không tự hash password bằng thư viện
 * ngoài) — BetterAuth tự hash bằng scrypt nội bộ, đảm bảo tương thích với
 * việc verify lúc đăng nhập sau này. Idempotent: bỏ qua nếu đã tồn tại.
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

    await auth.api.createUser({
      body: {
        email: `${seedUser.phoneNumber}@pos.internal`,
        password: seedUser.password,
        name: seedUser.name,
        role: seedUser.role,
        data: {
          phoneNumber: seedUser.phoneNumber,
          phoneNumberVerified: true,
        },
      },
    });
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

async function main() {
  console.log("Seeding users...");
  await seedUsers();

  console.log("Seeding areas & tables...");
  await seedAreasAndTables();

  console.log("Seeding menu...");
  await seedMenu();

  console.log("Seeding printers...");
  await seedPrinters();

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
