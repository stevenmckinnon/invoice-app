import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@/generated/prisma";
import { Resend } from "resend";
import {
  getPasswordResetEmailHtml,
  getPasswordResetEmailText,
} from "./email-templates";

const prisma = new PrismaClient();

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
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
      } else {
        console.warn(
          "⚠️ RESEND_API_KEY not configured. Password reset email not sent."
        );
        console.log(
          "Password reset link (copy this for testing):",
          url
        );
      }
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || "secret-for-development-only",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  trustedOrigins: [
    "http://localhost:3000",
    "https://invoice-app-drab-psi.vercel.app",
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "better-auth",
  },
});

export type Session = typeof auth.$Infer.Session;

