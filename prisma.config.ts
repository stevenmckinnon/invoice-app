import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Mirrors Next.js's load order, because the Prisma CLI has none of its own:
// loading only .env here would point db:push / db:studio / db:migrate at the
// hosted database while `pnpm dev` was safely on the local one — the worst
// possible split. dotenv keeps the FIRST value it finds for a key, so this
// array runs highest-priority first. (Node's --env-file, used by the test and
// seed scripts, is the opposite: last file wins.)
config({ path: [".env.local", ".env.development", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
