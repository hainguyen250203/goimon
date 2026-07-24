import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as authSchema from "~/server/better-auth/schema";
import * as activityLogSchema from "~/modules/activity-log/infrastructure/activity-log.schema";
import * as menuSchema from "~/modules/menu/infrastructure/menu.schema";
import * as orderSchema from "~/modules/order/infrastructure/order.schema";
import * as printerSchema from "~/modules/printer/infrastructure/printer.schema";
import * as tableSchema from "~/modules/table/infrastructure/table.schema";

const schema = {
  ...authSchema,
  ...tableSchema,
  ...menuSchema,
  ...orderSchema,
  ...printerSchema,
  ...activityLogSchema,
};

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
