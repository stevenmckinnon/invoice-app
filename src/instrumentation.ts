import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry-options";

// Called once per server instance, for both the Node and edge runtimes
export async function register() {
  Sentry.init(sentryOptions);
}

// Reports errors thrown while rendering server components, route handlers
// and server actions — the ones that otherwise only reach the Vercel logs
export const onRequestError = Sentry.captureRequestError;
