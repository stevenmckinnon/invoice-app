import type { RateLimitWindow } from "@/lib/rate-limit";

/**
 * Sign-up stays open to anyone, so these are what stand between it and a
 * script. Email verification alone doesn't: a disposable inbox is public, so
 * a script can read its own verification link (on 27 Nov 2026 nine probe
 * accounts were made from one IP with mailinator addresses).
 */

/**
 * Throwaway inbox services, plus the domains reserved for examples, which
 * can't receive mail. Not exhaustive; it raises the cost of scripting
 * accounts, and the per-IP limit below covers what it misses. `.test`
 * addresses are left alone: the seed and local scripts use them, and they
 * can't receive a verification email either.
 */
const DISPOSABLE_DOMAINS = new Set([
  // Reserved (RFC 2606)
  "example.com",
  "example.net",
  "example.org",
  // Public and temporary inboxes
  "10minutemail.com",
  "10minutemail.net",
  "anonaddy.me",
  "binkmail.com",
  "bobmail.info",
  "burnermail.io",
  "dispostable.com",
  "dropmail.me",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "grr.la",
  "harakirimail.com",
  "inboxbear.com",
  "inboxkitten.com",
  "mail.tm",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailinator2.com",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "moakt.com",
  "mytemp.email",
  "nada.email",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "tempmail.dev",
  "tempmail.net",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.de",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

/** True for an address at a throwaway or reserved domain, or a subdomain of one */
export const isDisposableEmail = (email: string): boolean => {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const labels = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .split(".");
  // "mail.mailinator.com" is checked as itself, then "mailinator.com"
  for (let i = 0; i < labels.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(labels.slice(i).join("."))) return true;
  }
  return false;
};

/** Per IP: plenty for a household sharing a connection, too few for a script */
export const SIGNUP_RATE_LIMITS: RateLimitWindow[] = [
  { name: "signup:hour", limit: 3, windowMs: 60 * 60 * 1000 },
  { name: "signup:day", limit: 10, windowMs: 24 * 60 * 60 * 1000 },
];

/**
 * The caller's IP. On Vercel the first `x-forwarded-for` entry is the client
 * (Vercel sets the header itself, so it can't be supplied by the caller).
 * Null when there's no request, as when the seed calls better-auth directly.
 */
export const clientIp = (headers: Headers | undefined | null): string | null => {
  const forwarded = headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers?.get("x-real-ip")?.trim() || null;
};
