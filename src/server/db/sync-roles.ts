import "dotenv/config";

import { eq } from "drizzle-orm";

import { role } from "~/modules/role/infrastructure/role.schema";
import { db } from "~/server/db";
import { SEED_ROLES } from "./default-role-permissions";

/**
 * Đồng bộ 4 role mặc định (`user`/`viewer`/`manager`/`admin`) với catalog
 * permission hiện tại trong code — tạo mới nếu chưa có, GHI ĐÈ lại
 * description + permissions nếu đã có (2 role này luôn phải khớp đúng code,
 * không phải chỗ để admin tự tuỳ biến — cần role khác hành vi thì tạo role
 * MỚI với tên khác qua trang Vai trò, không sửa trực tiếp 4 role mặc định).
 *
 * An toàn để chạy lại bất kỳ lúc nào (kể cả sau khi đổi tên permission key
 * trong permission-definitions.ts) — script ĐỘC LẬP, chỉ đụng bảng `role`,
 * không đụng users/areas/tables/printer/payment-config (khác `seed.ts`).
 * Role tự tạo thêm với tên khác 4 tên trên không bị đụng tới.
 */
async function syncRoles() {
  for (const seedRole of SEED_ROLES) {
    const [existing] = await db.select().from(role).where(eq(role.name, seedRole.name));
    if (existing) {
      await db
        .update(role)
        .set({ description: seedRole.description, permissions: seedRole.permissions })
        .where(eq(role.id, existing.id));
      console.log(`  đã đồng bộ role "${seedRole.name}"`);
      continue;
    }
    await db.insert(role).values(seedRole);
    console.log(`  tạo role "${seedRole.name}"`);
  }
}

syncRoles()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Lỗi khi đồng bộ role:", error);
    process.exit(1);
  });
