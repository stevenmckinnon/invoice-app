@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (binds to 0.0.0.0, runs prisma generate first)
pnpm build        # Production build (runs prisma generate first)
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix

pnpm db:migrate   # Run pending migrations (prisma migrate deploy)
pnpm db:push      # Push schema changes without migration (dev only)
pnpm db:studio    # Open Prisma Studio GUI
```

After editing `prisma/schema.prisma`, run `pnpm prisma generate` to regenerate the client (or just restart dev — `predev` does it automatically).

## Architecture

**Caley** is a Next.js 16 invoice management app for freelancers, deployed on Vercel with a PostgreSQL database.

### Key Patterns

**Authentication** — Uses `better-auth` (not NextAuth). The server instance is at `src/lib/auth.ts`; the client wrapper is at `src/lib/auth-client.ts`. In route handlers, get the session with:

```ts
const session = await auth.api.getSession({ headers: await headers() });
```

In client components, use `useSession()` from `@/lib/auth-client`. All data is user-scoped — every DB query filters by `userId: session.user.id`.

**Database** — Prisma 7 with a `pg` connection pool via `@prisma/adapter-pg`. The singleton client is at `src/lib/db.ts`. The Prisma client is generated into `src/generated/prisma/` (not the default location) — always import from `@/generated/prisma/client`.

**Data fetching** — TanStack Query (React Query) for all client-side data. Custom hooks live in `src/hooks/` (`use-invoices.ts`, `use-clients.ts`). API routes are Next.js Route Handlers under `src/app/api/`. Zod schemas validate all API inputs server-side.

**PDF generation** — `src/lib/pdf.ts` contains `calculateInvoiceTotals` and the PDF rendering logic using `@react-pdf/renderer`. Invoice PDFs are served from `src/app/api/invoices/[id]/pdf/route.ts`.

**Layout** — `ConditionalLayout` wraps the app to show the nav/sidebar only on authenticated app pages (not on the marketing home page or auth pages). The `Providers` component wraps with React Query and `next-themes`.

**UI** — shadcn/ui components in `src/components/ui/`. `sonner` for toast notifications. `motion` (Framer Motion) for animations. Fonts: Satoshi (local, body), Oswald (Google, headings via `font-oswald` class), Roboto Mono (Google, mono).

### Data Model

Core models in `prisma/schema.prisma`:

- `User` — extended with profile fields (address, banking details like IBAN/SWIFT) used to pre-fill invoices
- `Invoice` — belongs to `User`, optionally to a `Client`. Has `InvoiceLineItem[]`, `OvertimeEntry[]`, `CustomExpenseEntry[]` relations. Status: `draft | sent | paid | overdue`
- `Client` — belongs to `User`, stores address and rate defaults (`dayRate`, `perDiemWork`, `perDiemTravel`)

Invoice totals (`subtotalLabor`, `subtotalPerDiem`, `subtotalTravel`, `totalAmount`) are calculated via `calculateInvoiceTotals()` before saving — they are stored denormalized in the DB.

### AI Chat (`src/components/ai/`)

A chat assistant powered by Claude, with two surfaces sharing one conversation:

- `ChatProvider.tsx` — owns the single `useChat` instance, drawer open state, localStorage persistence, and derives `draftInvoiceId` from the message list. Mounted in `ConditionalLayout` above both surfaces, so the drawer and `/chat` are never two separate conversations.
- `ChatContent.tsx` — the conversation + input. No layout of its own; takes a `className`.
- `AiChat.tsx` — desktop FAB + right drawer. Widens to 860px on `lg` when a draft exists.
- `ChatPageView.tsx` — the `/chat` route (mobile surface, linked from `MobileBottomNav`).
- `DraftInvoicePreview.tsx` — live view of the draft being built, beside the conversation on `lg`, a collapsible panel below it. Refetches on the generating → idle edge.

UI primitives live in `src/components/ai-elements/` (shadcn AI Elements). **These are forked** — several are ahead of upstream (`shimmer` pre-builds motion components, `conversation` adds download/markdown export, `code-block` adds a language selector). Do not re-run the AI Elements installer; it would clobber that work.

Chat history persists in `localStorage` under `"caley-chat-session"` (debounced 500ms, so a refresh mid-stream keeps partial output).

Uses **AI SDK v7** (`ai` 7.x, `@ai-sdk/react` 4.x, `@ai-sdk/anthropic` 4.x). v7 keeps deprecated v6 aliases that still typecheck — prefer the current names:

- `instructions:` on `streamText`, not `system:` (deprecated)
- `stopWhen: isStepCount(N)`, not `stepCountIs(N)` (aliased to the same function)
- `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`, not `result.toUIMessageStreamResponse()` (deprecated, removed next major)
- `useChat({ throttle })`, not `experimental_throttle` (deprecated)
- `useChat` is from `@ai-sdk/react`, configured with `transport: new DefaultChatTransport({ api })`
- `sendMessage({ text })` replaces `append()`
- `tool()` uses `inputSchema` (not `parameters`)
- `UIMessage` has no `content` string — extract text via `.parts.filter(isTextUIPart)`
- Tool parts use `part.type === "tool-{name}"` with `state`/`output` directly (no `toolInvocation` wrapper)
- `convertToModelMessages(messages)` is async — must be awaited

The API route at `src/app/api/chat/route.ts` loads user profile, clients, and invoice stats as instructions context, then provides two tools: `createInvoiceDraft` and `updateInvoiceDraft`.

### Environment Variables

- `ANTHROPIC_API_KEY` — Anthropic API key for the AI chat feature
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — session encryption secret (32+ chars)
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — canonical app URL
- `RESEND_API_KEY` — email sending (password reset); optional in dev (link logged to console)
- `EMAIL_FROM` — sender address (`onboarding@resend.dev` works for dev)
