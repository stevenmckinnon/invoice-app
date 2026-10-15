import { prisma } from "@/lib/db";

export interface RateLimitWindow {
  /** Distinguishes windows for the same subject, e.g. "chat:burst" */
  name: string;
  limit: number;
  windowMs: number;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; window: RateLimitWindow; retryAfterSeconds: number };

/**
 * Fixed-window counter in Postgres. One statement per window: it either
 * starts a fresh window or increments the current one, atomically, so
 * concurrent requests on different serverless instances can't both slip
 * under the limit.
 *
 * A request counts against every window even when an earlier one already
 * refused it — otherwise someone sitting on the burst limit would never
 * accrue against the daily one.
 */
export const checkRateLimit = async (
  subject: string,
  windows: RateLimitWindow[],
): Promise<RateLimitResult> => {
  let refusal: RateLimitResult = { ok: true };

  for (const window of windows) {
    const key = `${window.name}:${subject}`;
    const windowSeconds = window.windowMs / 1000;

    const [row] = await prisma.$queryRaw<
      { count: number; windowStart: Date }[]
    >`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" <= now() - make_interval(secs => ${windowSeconds})
          THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "windowStart" = CASE
          WHEN "RateLimit"."windowStart" <= now() - make_interval(secs => ${windowSeconds})
          THEN now()
          ELSE "RateLimit"."windowStart"
        END
      RETURNING "count", "windowStart"
    `;

    if (refusal.ok && row.count > window.limit) {
      const resetsAt = row.windowStart.getTime() + window.windowMs;
      refusal = {
        ok: false,
        window,
        retryAfterSeconds: Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000)),
      };
    }
  }

  return refusal;
};
