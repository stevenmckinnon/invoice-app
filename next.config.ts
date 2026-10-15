import { withSentryConfig } from "@sentry/nextjs/config";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The default bottom-left sits on top of the rail's account menu
  devIndicators: { position: "bottom-right" },
  // @formepdf/core loads a WASM binary relative to its own __dirname at
  // runtime (wasm-pack's Node target) — bundling breaks that lookup. And
  // @formepdf/react must be external too: @formepdf/core dynamically
  // imports it internally to serialize the JSX tree, identifying most
  // components (Page, View, Table, ...) by reference equality against its
  // own copy — a second, bundled copy of @formepdf/react here would never
  // match, silently dropping everything below <Document>.
  serverExternalPackages: ["@formepdf/core", "@formepdf/react"],
};

// Uploads source maps at build time so stack traces in Sentry point at real
// source lines. Without SENTRY_AUTH_TOKEN (local builds, CI) the upload is
// skipped and the build is otherwise unchanged.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  silent: !process.env.CI,
  telemetry: false,
});
