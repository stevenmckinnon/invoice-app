/**
 * Short-lived signed links to an invoice's PDF, for callers that can't send a
 * session cookie or bearer token: the MCP connector hands one to the person,
 * whose browser opens it.
 *
 * The link names the invoice and the user it belongs to and expires after ten
 * minutes. It is checked before the database is touched, and it opens that one
 * invoice's PDF and nothing else. It is still a bearer capability (the PDF has
 * the bank details on it), so the lifetime is short and responses are
 * `no-store`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const PDF_LINK_TTL_SECONDS = 10 * 60;

const secret = () => {
  const value = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (value) return value;
  // Same rule as auth.ts: the development fallback is never used in production
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET must be set in production");
  }
  return "secret-for-development-only";
};

const signature = (invoiceId: string, userId: string, exp: number) =>
  createHmac("sha256", secret())
    // The prefix keeps a PDF link from ever being valid as anything else
    .update(`caley-pdf-link:${invoiceId}:${userId}:${exp}`)
    .digest("base64url");

export interface PdfLinkParams {
  u: string;
  exp: string;
  sig: string;
}

export const signPdfLink = (
  invoiceId: string,
  userId: string,
  now = Date.now(),
): PdfLinkParams => {
  const exp = Math.floor(now / 1000) + PDF_LINK_TTL_SECONDS;
  return { u: userId, exp: String(exp), sig: signature(invoiceId, userId, exp) };
};

/** The user the link was made for, or null if it's forged, altered or expired */
export const verifyPdfLink = (
  invoiceId: string,
  { u, exp, sig }: Partial<Record<keyof PdfLinkParams, string | null>>,
  now = Date.now(),
): string | null => {
  if (!u || !exp || !sig || !/^\d+$/.test(exp)) return null;
  const expiry = Number(exp);
  if (expiry * 1000 < now) return null;

  const expected = Buffer.from(signature(invoiceId, u, expiry));
  const given = Buffer.from(sig);
  if (expected.length !== given.length) return null;
  return timingSafeEqual(expected, given) ? u : null;
};
