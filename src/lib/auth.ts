
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, jwt } from "better-auth/plugins";
import { networkInterfaces } from "node:os";
import { Resend } from "resend";

import { prisma } from "@/lib/db";

import {
  getPasswordResetEmailHtml,
  getPasswordResetEmailText,
} from "./email-templates";

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// A known fallback secret would let anyone forge session cookies, so it is
// only ever allowed outside production
const secret =
  process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || undefined;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("BETTER_AUTH_SECRET must be set in production");
}

/**
 * In development, also trust this machine's own LAN addresses, so the app can
 * be signed into from a phone on the same Wi-Fi (`pnpm dev` binds 0.0.0.0).
 * Read from the interfaces rather than hard-coded, since DHCP moves them.
 */
const lanDevOrigins = () => {
  if (process.env.NODE_ENV !== "development") return [];
  const port = process.env.PORT ?? "3000";
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => `http://${net!.address}:${port}`);
};

const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

/** Better Auth's issuer: its base URL plus the auth route's path */
export const authIssuer = `${baseURL}/api/auth`;

/** The MCP endpoint: what a connector's access tokens are issued for */
export const MCP_RESOURCE = `${baseURL}/api/mcp`;

/** Read-only for now; invoices:write arrives with the tools that change things */
export const MCP_SCOPES = ["openid", "profile", "offline_access", "invoices:read"];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
    // A reset is how a user locks out whoever has their password
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Always log in development
      if (process.env.NODE_ENV === "development") {
        console.log("\n🔑 Password Reset Link:");
        console.log(`User: ${user.email}`);
        console.log(`URL: ${url}\n`);
      }

      // Send email via Resend if configured
      if (resend) {
        try {
          // Construct base URL for assets
          const baseUrl =
            process.env.BETTER_AUTH_URL ||
            process.env.NEXT_PUBLIC_APP_URL ||
            "http://localhost:3000";

          const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
            to: user.email,
            subject: "Reset your password - Caley",
            html: getPasswordResetEmailHtml({
              resetUrl: url,
              userEmail: user.email,
              logoUrl: `${baseUrl}/email-logo.png`,
            }),
            text: getPasswordResetEmailText({
              resetUrl: url,
              userEmail: user.email,
            }),
          });

          if (error) {
            console.error("Failed to send password reset email:", error);
            throw new Error("Failed to send reset email");
          }

          console.log("✅ Password reset email sent successfully:", data?.id);
        } catch (error) {
          console.error("Error sending password reset email:", error);
          throw error;
        }
      } else if (process.env.NODE_ENV === "production") {
        // Never log the link here: anyone with log access could use it
        console.error(
          "RESEND_API_KEY not configured. Password reset email not sent.",
        );
        throw new Error("Password reset email is not configured");
      } else {
        // The link itself is logged above in development
        console.warn(
          "⚠️ RESEND_API_KEY not configured. Password reset email not sent.",
        );
      }
    },
  },
  // The iOS app signs in with email + password, keeps the `set-auth-token`
  // response header in the Keychain and sends it back as a Bearer token. Web
  // sessions are unchanged.
  //
  // The rest make Caley an OAuth server for MCP clients (Claude on the phone
  // and laptop): it signs you in once through the normal login, then
  // `/api/mcp` accepts the tokens issued. Clients identify themselves with a
  // Client ID Metadata Document, so nothing is registered by hand.
  plugins: [
    bearer(),
    jwt(),
    mcp({
      loginPage: "/auth/signin",
      consentPage: "/consent",
      resource: MCP_RESOURCE,
      // Prisma can't store a resource without its scopes
      resources: [{ identifier: MCP_RESOURCE, allowedScopes: MCP_SCOPES }],
      scopes: MCP_SCOPES,
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
  ],
  session: {
    // Serve getSession from a signed cookie instead of hitting the DB on
    // every request. Revocations can lag by up to maxAge.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  secret: secret ?? "secret-for-development-only",
  baseURL,
  trustedOrigins: [
    "http://localhost:3000",
    "https://invoice-app-drab-psi.vercel.app",
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ...lanDevOrigins(),
  ].filter(Boolean) as string[],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "better-auth",
  },
});

export type Session = typeof auth.$Infer.Session;
