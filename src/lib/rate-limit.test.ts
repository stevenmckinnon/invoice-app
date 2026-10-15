/**
 * The rate limiter runs a single SQL upsert, so the only honest test is
 * against Postgres. Like invoice-tools.execute.test.ts, this needs
 * TEST_DATABASE_URL and skips without it rather than touching DATABASE_URL.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// Must be set before anything pulls in db.ts, which reads it at module load
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;

describe("checkRateLimit", { skip: !testDatabaseUrl }, () => {
  let checkRateLimit: typeof import("@/lib/rate-limit").checkRateLimit;
  let prisma: typeof import("@/lib/db").prisma;
  // Unique per run so parallel runs and leftovers never collide
  const prefix = `test-${randomUUID()}`;

  before(async () => {
    ({ checkRateLimit } = await import("@/lib/rate-limit"));
    ({ prisma } = await import("@/lib/db"));
  });

  after(async () => {
    await prisma.rateLimit.deleteMany({
      where: { key: { contains: prefix } },
    });
    await prisma.$disconnect();
  });

  const window = (name: string, limit: number, windowMs = 60_000) => ({
    name: `${prefix}:${name}`,
    limit,
    windowMs,
  });

  it("allows up to the limit, then refuses", async () => {
    const w = window("basic", 3);
    for (let i = 0; i < 3; i++) {
      assert.equal((await checkRateLimit("user", [w])).ok, true);
    }
    const refused = await checkRateLimit("user", [w]);
    assert.equal(refused.ok, false);
    if (!refused.ok) {
      assert.equal(refused.window.name, w.name);
      assert.ok(refused.retryAfterSeconds > 0 && refused.retryAfterSeconds <= 60);
    }
  });

  it("counts each subject separately", async () => {
    const w = window("subjects", 1);
    assert.equal((await checkRateLimit("alice", [w])).ok, true);
    assert.equal((await checkRateLimit("bob", [w])).ok, true);
    assert.equal((await checkRateLimit("alice", [w])).ok, false);
  });

  it("starts a fresh window once the old one has passed", async () => {
    const w = window("reset", 1, 300);
    assert.equal((await checkRateLimit("user", [w])).ok, true);
    assert.equal((await checkRateLimit("user", [w])).ok, false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.equal((await checkRateLimit("user", [w])).ok, true);
  });

  it("can't be raced past the limit by concurrent requests", async () => {
    const w = window("race", 20);
    const results = await Promise.all(
      Array.from({ length: 30 }, () => checkRateLimit("user", [w])),
    );
    assert.equal(results.filter((r) => r.ok).length, 20);
  });

  it("keeps counting the long window while the short one refuses", async () => {
    const burst = window("burst", 1);
    const day = window("day", 3);
    await checkRateLimit("user", [burst, day]);
    await checkRateLimit("user", [burst, day]); // refused by burst
    await checkRateLimit("user", [burst, day]); // refused by burst
    const row = await prisma.rateLimit.findUnique({
      where: { key: `${day.name}:user` },
    });
    assert.equal(row?.count, 3);
  });
});
