import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";

import { ConsentForm } from "@/app/consent/consent-form";
import CaleyLogo from "@/components/CaleyLogo";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Connect to Caley" };

/** What each scope lets the app do, in words a person would use */
const SCOPE_TEXT: Record<string, string> = {
  "invoices:read": "See your clients and invoices, including amounts",
  offline_access: "Stay connected until you disconnect it",
  openid: "Know which Caley account this is",
  profile: "Know your name",
};

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const params = await searchParams;
  const query = new URLSearchParams();
  // The signed query repeats some keys (ba_param), so keep every value
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value].flat()) {
      if (item !== undefined) query.append(key, item);
    }
  }

  // The query is signed by the authorization server: a changed or stale one
  // would let a link choose which scopes get approved
  const { secret } = await auth.$context;
  const valid = await verifyOAuthQueryParams(query.toString(), secret);

  const clientId = query.get("client_id") ?? "";
  const client = valid
    ? await prisma.oauthClient.findUnique({
        where: { clientId },
        select: { name: true, uri: true },
      })
    : null;
  const scopes = (query.get("scope") ?? "").split(" ").filter(Boolean);

  // A client's name is whatever it says it is; the address it's at is not
  let host = clientId;
  try {
    host = new URL(clientId).host;
  } catch {
    // Not a URL: show it as given
  }

  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-sm md:p-8 dark:border">
        <CaleyLogo className="mb-6 h-8 w-8" />
        {valid ? (
          <>
            <h1 className="text-xl font-semibold">
              Connect {client?.name ?? host} to Caley?
            </h1>
            {client?.name && client.name !== host && (
              <p className="text-muted-foreground mt-1 text-sm">{host}</p>
            )}
            <p className="mt-4 text-sm">It will be able to:</p>
            <ul className="mt-2 space-y-2 text-sm">
              {scopes.map((scope) => (
                <li key={scope} className="flex gap-2">
                  <span aria-hidden>•</span>
                  {SCOPE_TEXT[scope] ?? scope}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-4 text-xs">
              It can&apos;t change or delete anything. You can disconnect it at
              any time.
            </p>
            <ConsentForm />
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">This link has expired</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Start the connection again from the app you were setting up.
            </p>
          </>
        )}
      </div>
    </main>
  );
};

export default Page;
