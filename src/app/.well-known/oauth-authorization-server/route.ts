import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";

import { auth } from "@/lib/auth";

/** RFC 8414 metadata: where to authorize, get tokens, and how clients identify themselves */
export const GET = oauthProviderAuthServerMetadata(auth);
