import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { MCP_RESOURCE, auth } from "@/lib/auth";
import { createCaleyMcpServer } from "@/lib/mcp-tools";

/**
 * Caley's MCP endpoint, for Claude on the phone and laptop. `requireMcpAuth`
 * checks the OAuth access token (signature, issuer, audience, expiry and the
 * scope) and hands over its claims; `sub` is the user the token belongs to,
 * so every tool runs as them and nobody else.
 *
 * The default `legacy: "stateless"` also answers clients still speaking the
 * 2025 protocol, which is what Claude's apps may send.
 */
export const POST = requireMcpAuth(
  auth,
  (request, claims) => {
    const userId = claims.sub;
    if (!userId) return new Response("Unauthorized", { status: 401 });
    return createMcpHandler(() => createCaleyMcpServer(userId)).fetch(request);
  },
  { resource: MCP_RESOURCE, requiredScopes: ["invoices:read"] },
);
