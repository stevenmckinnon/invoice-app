import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000"),
  // oauthProviderClient lets the sign-in and consent pages carry on an MCP
  // client's authorization; inferAdditionalFields lets sign-up send the names
  // (see `user` in auth.ts)
  plugins: [oauthProviderClient(), inferAdditionalFields<typeof auth>()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  changePassword,
} = authClient;
