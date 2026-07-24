import { type Config } from "drizzle-kit";

import { env } from "~/env";

export default {
  schema: [
    "./src/server/better-auth/schema.ts",
    "./src/modules/*/infrastructure/*.schema.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
