import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry-options";

// Runs in the browser before the app hydrates. See sentry-options.ts for why
// Session Replay is not among the integrations.
Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
