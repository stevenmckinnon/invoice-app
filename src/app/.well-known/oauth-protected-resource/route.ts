import { MCP_RESOURCE, MCP_SCOPES, authIssuer } from "@/lib/auth";

/**
 * RFC 9728: tells an MCP client which authorization server protects
 * `/api/mcp`, and which scopes it understands. The plugin can serve this
 * itself, but its handler only answers under `/api/auth` and clients look at
 * the site root, so it's written out here from the same config.
 */
export const GET = () =>
  Response.json(
    {
      resource: MCP_RESOURCE,
      authorization_servers: [authIssuer],
      bearer_methods_supported: ["header"],
      // Identity and refresh scopes belong to the authorization server
      scopes_supported: MCP_SCOPES.filter((scope) =>
        scope.startsWith("invoices:"),
      ),
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
