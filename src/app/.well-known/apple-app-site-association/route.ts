import { appSiteAssociation } from "@/lib/app-association";

/**
 * Apple fetches this with no cookies and refuses redirects, so `proxy.ts` leaves `/.well-known`
 * alone. It has no file extension, so it is served here to get an `application/json` type.
 */
export const GET = () =>
  Response.json(appSiteAssociation, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
