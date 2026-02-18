import type { Config } from "drizzle-kit";

export default {
  schema: "./src/database/schema/schemas.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "expo"
} satisfies Config;
