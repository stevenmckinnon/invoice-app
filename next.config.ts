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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Same-origin rather than 'none': PdfPreviewDialog shows
          // /api/invoices/[id]/pdf in an iframe on our own pages. This still
          // stops any other site framing Caley for clickjacking.
          // Not a full CSP — scripts and styles are unrestricted for now.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing uses these. display-capture stays allowed for our own
          // origin: the chat's PromptInput supports screenshots.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(self)",
          },
          // No includeSubDomains or preload: both reach beyond this app,
          // and preload is hard to undo.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000",
          },
        ],
      },
    ];
  },
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
