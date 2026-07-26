import { sql } from "drizzle-orm";
import { pgEnum, pgTable, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "~/server/better-auth/schema";

export const shiftStatusEnum = pgEnum("shift_status", ["open", "closed"]);

export const shift = pgTable(
  "shifts",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    openedBy: text("opened_by")
      .notNull()
      .references(() => user.id),
    closedBy: text("closed_by").references(() => user.id),
    status: shiftStatusEnum("status").notNull().default("open"),
    startTime: timestamp("start_time").notNull().defaultNow(),
    endTime: timestamp("end_time"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    // Chỉ 1 ca được mở tại 1 thời điểm trên toàn nhà hàng.
    uniqueIndex("shifts_only_one_open_idx")
      .on(t.status)
      .where(sql`${t.status} = 'open'`),
  ],
);
