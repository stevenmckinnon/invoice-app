/**
 * Options shared by every Sentry runtime (browser, Node, edge).
 *
 * Sentry is inert until NEXT_PUBLIC_SENTRY_DSN is set, and only reports from
 * production builds, so local development and CI never send anything.
 *
 * Privacy: invoices carry IBANs, sort codes and client addresses, so nothing
 * here records what's on screen or in request bodies. sendDefaultPii stays
 * off (no IPs, cookies or headers), and Session Replay is deliberately not
 * enabled — it would capture banking details from the invoice views.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled:
    Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) &&
    process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  // Errors are always sent; performance traces are sampled to stay in quota
  tracesSampleRate: 0.1,
};
