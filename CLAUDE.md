@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (binds to 0.0.0.0, runs prisma generate first)
pnpm build        # Production build (runs prisma generate first)
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix
pnpm test         # Node's test runner via tsx
pnpm typecheck    # tsc --noEmit

pnpm db:migrate   # Run pending migrations (prisma migrate deploy)
pnpm db:push      # Push schema changes without migration (prototyping only)
pnpm prisma migrate dev --name <name>   # Create a migration from schema changes
pnpm db:studio    # Open Prisma Studio GUI

pnpm db:local:up     # Start the local postgres container and push the schema
pnpm db:local:down   # Stop it (data survives in a named volume)
pnpm db:local:reset  # Wipe the volume, recreate, push schema, reseed
pnpm db:seed         # Reseed the local database
```

After editing `prisma/schema.prisma`, run `pnpm prisma generate` to regenerate the client (or just restart dev — `predev` does it automatically).

## Local development database

Day-to-day work runs against a local postgres container (`compose.yaml`), not the live Neon instance.

```bash
pnpm db:local:up && pnpm db:seed
```

`.env.development` is committed and points `DATABASE_URL` at the container (no secrets — the credentials match `compose.yaml`). Next.js resolves `process.env` → `.env.development.local` → `.env.local` → `.env.development` → `.env`; the Prisma CLI (via `prisma.config.ts`) and `pnpm test` mirror that chain because neither has one of its own. **Keep those three in sync** — if only some read the local files, `pnpm dev` ends up on the local database while `pnpm db:push` rewrites the live one.

Note the two loaders order their files oppositely: dotenv keeps the _first_ value it finds, Node's `--env-file` lets the _last_ file win. The arrays in `prisma.config.ts` and the `test` / `db:seed` scripts are therefore written in opposite orders on purpose.

To work against Neon, set `DATABASE_URL` in your own untracked `.env.local`, which outranks `.env.development`. Secrets always come from `.env`.

Reseeding replaces the user, but the Better Auth session cookie cache serves the old one for up to 5 minutes — sign out and back in, or the app looks logged in with no data.

Seed credentials: `dev@caley.test` / `devpassword123`. The seed (`prisma/seed.ts`) builds the user through better-auth so the password hash is one it can verify, computes invoice totals with `calculateInvoiceTotals` so seeded rows can't disagree with what the app renders, and **refuses to run against a non-local host** (override with `SEED_ALLOW_REMOTE=1`). Re-running is safe — the seeded user is deleted first and everything cascades.

It seeds three clients (one with tiered overtime, one without, one with no rates at all) and twelve invoices: seven in the current tax year across every status (one billed in USD, so the dashboard currency picker appears) and five paid ones in the previous year, so year-on-year comparisons have a baseline. One of those is dated 3 April, inside the 1–5 April window that belongs to the year ending. One current-year invoice (INV-2607, "Triplemania 34") is **built from days** and priced through `dayBillingWrites`, so the day strip and calendar editor have something to show; the other eleven are count-based.

**Migrations.** History was squashed into a single `0_init` baseline on 15 Oct 2026. The old history couldn't be replayed from empty: `20250116000000_add_client_model` sorted before the migration that created `Invoice`. A fresh database now builds with `migrate deploy`, and CI proves that on every run (`migrate deploy`, then `migrate diff --exit-code` against the schema). For schema changes, use `pnpm prisma migrate dev --name …` against the local container; it needs a local database built from migrations, so if yours predates the squash, run `pnpm db:local:reset` once.

**Deploys do not run migrations.** `build` only runs `prisma generate`; production (Neon) is migrated by hand with `DATABASE_URL=<neon> pnpm db:migrate`. Prisma selects every scalar column by default, so code that knows about a new column fails with "column does not exist" if it deploys first. Keep migrations additive (nullable columns, columns with defaults, new tables) so the old code runs against the migrated database, and **migrate production before merging**. Check with `prisma migrate status` against production (read-only); it also lists seven pre-squash migrations as "not found locally", which is expected.

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

**PDF generation** — `src/lib/pdf.tsx` has `calculateInvoiceTotals` and the template router; PDFs are rendered by `@formepdf` and served from `src/app/api/invoices/[id]/pdf/route.ts`. The default template is **Caley** (`src/lib/pdf-caley.tsx`), the invoice page's paper on A4: it reads the stored rows through `summariseInvoice`, so the PDF and the page can't disagree. Overtime is one line per date and rate, on both. It embeds Satoshi and JetBrains Mono from `src/fonts/pdf/` (TTFs read at request time, so `next.config.ts` traces them into the PDF route; formepdf ignored custom fonts before 0.28). The preview dialog remembers the last template in `localStorage`.

**Layout** — `ConditionalLayout` wraps the app to show the nav/sidebar only on authenticated app pages (not on the marketing home page or auth pages). The `Providers` component wraps with React Query and `next-themes`.

**UI** — shadcn/ui components in `src/components/ui/`. `sonner` for toast notifications. `motion` (Framer Motion) for animations. Fonts: Satoshi (local, body), Oswald (Google, headings via `font-oswald` class), Roboto Mono (Google, mono).

### Data Model

Core models in `prisma/schema.prisma`:

- `User` — extended with profile fields (address, banking details like IBAN/SWIFT) used to pre-fill invoices
- `Invoice` — belongs to `User`, optionally to a `Client`. Has `InvoiceLineItem[]`, `OvertimeEntry[]`, `CustomExpenseEntry[]` and `InvoiceDay[]` relations, plus `terms` (a JSON snapshot of the client's billing terms; null on count-based invoices). Status: `draft | sent | paid | overdue`. `invoiceNumber` is unique per user.
- `InvoiceDay` — one billed date of a day-based invoice; see "Invoices built from days" below
- `Client` — belongs to `User`, stores address and billing terms: `dayRate`, `perDiemWork`, `perDiemTravel`, the overtime tier (`overtimeTierHours`, `overtimeFirstRate`, `overtimeAfterRate`) and the travel + work rule (`travelWorkBill`, `travelWorkPerDiem`)

Invoice totals (`subtotalLabor`, `subtotalPerDiem`, `subtotalTravel`, `totalAmount`) are calculated via `calculateInvoiceTotals()` before saving — they are stored denormalized in the DB.

### Invoices built from days

New invoices are built from the **dated days** of a job, not typed counts. Every invoice is one of two kinds, **for life**:

- **Day-based** (`Invoice.terms` is set): its `InvoiceDay` rows (`work | travel | dark`, an optional `alsoTravel: out | home` for a work day that also had travel, `overtimeHours`) are the source of truth. A day off is the absence of a row. On every save, `billDays()` (`src/lib/billing.ts`) turns the days and the invoice's `terms` into the five standard line items, dated overtime entries and the total, written by `dayBillingWrites()` (`src/lib/day-invoice.ts`). The calendar editor (`src/components/invoice-editor/`), the API and the chat tools all go through it.
- **Count-based** (`terms` is null): invoices made before days existed. They keep their stored lines and are **never converted**, and their billing is **locked**: `POST` and `PUT` take days only, `PUT` refuses a count-based invoice, and its edit route shows a notes-only view. Status and notes change through `PATCH` on any invoice. A mistake on one is fixed by issuing a corrected invoice. The old count form is gone; nothing can create a count-based invoice any more.

The rules live in one place, `billDays`. Work, travel and dark days bill at the day rate. **Dark days take the travel per diem.** A work day with travel bills per the client's rule (`Client.travelWorkBill` / `travelWorkPerDiem`, default: both a work and a travel day, with the travel per diem). Overtime is day rate ÷ 10 an hour, split by the client's tier **per day**; no tier means all of it at 1.5×. Rates never vary by job for a client, so the form has no rate fields.

`Invoice.terms` is a **snapshot** of the client's terms when the invoice was created. Editing an invoice keeps it; only switching client re-prices. A later change to a client's rates never re-prices a sent invoice.

Pages read money from the **stored** rows (`summariseInvoice`, `src/lib/invoice-summary.ts`), never by re-billing in the browser, so they can't disagree with the PDF. INV-2605 (a real invoice, £3,748.13) is pinned in the tests: if a change moves it, the change is wrong.

UI: the invoice page shows the paper document plus the day strip (`src/components/invoice/`); new and day-based invoices use the calendar editor (`src/components/invoice-editor/`), whose preview runs the same `billDays`.

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

The API route at `src/app/api/chat/route.ts` loads user profile, clients, and invoice stats as instructions context, then provides two tools: `createInvoiceDraft` and `updateInvoiceDraft` (`src/lib/invoice-tools.ts`). Both take **dated days** (one entry per date, overtime as hours on the day) and price them with `billDays`, so their drafts are day-based and open in the calendar editor. A saved client's terms price the draft; an unsaved client needs explicit `rates`. Count-based drafts can't be updated by the tool.

### iOS app (`ios/Caley/`)

A native SwiftUI client (iOS 17+, no third-party packages) over the same route handlers: sign in, dashboard, invoice list and detail, status changes, PDF preview/share, a calendar editor to create and edit day-based invoices, an Assistant tab, and Account, which holds Clients (create, edit, delete) and Your details (profile and bank details). Four tabs: Clients is set up once and rarely visited, so it lives inside Account (`AppNavigation.accountPath` lets other screens open it). Count-based invoices have no Edit button (their billing is locked).

- **Auth** — better-auth's `bearer()` plugin (`src/lib/auth.ts`). `POST /api/auth/sign-in/email` returns the token in the `set-auth-token` header; the app keeps it in the Keychain and sends `Authorization: Bearer`. Web cookie sessions are unchanged. The plugin adds no tables, so deploy `auth.ts` before shipping a release build.
- **The editor never bills.** `POST /api/invoices/preview` (`src/app/api/invoices/preview/route.ts`) runs `billDays` for the app's live total, with the same terms rule as `PUT` (an invoice keeps its stored terms unless its client changes), so the total on screen is what a save stores. The day-painting rules (`DayEditor.swift`) are a port of `src/lib/day-editor.ts`: change one, change both. **A test holds them together:** `src/lib/day-editor.fixtures.test.ts` runs 200+ scenarios (hand-written and seeded-random) through the web rules and compares them with `ios/Caley/CaleyTests/day-editor-fixtures.json`, so changing `day-editor.ts` fails `pnpm test` (and CI) until you run `UPDATE_FIXTURES=1 pnpm test`. The iOS target `CaleyTests` replays the same file through `DayEditor.swift` and `DateOnly.monthGrid`: run it with `xcodebuild test -project ios/Caley/Caley.xcodeproj -scheme Caley -destination 'id=<simulator udid>' CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM= CODE_SIGNING_ALLOWED=YES`. CI does not run the Swift side, so run it after touching either file.
- **No cookies in the app.** `APIClient` turns cookie handling off: better-auth sets a session cookie on sign-in, and replaying it on the next sign-in is rejected ("Missing or null Origin"). `InvoiceStore` is cleared on sign-out so the next user never sees the previous one's invoices.
- **Money is read, never re-billed.** The detail screen shows stored rows (`items`, `overtimeEntries`, `customExpenseEntries`); the only derived line is overtime, as hourly = Work Days rate ÷ 10, exactly as `summariseInvoice` does. Prisma serialises `Decimal` as a string, so models decode it through `Amount`.
- **Assistant tab** talks to the same `POST /api/chat` as the web chat, with the same bearer token (`ChatStore`, `ChatView`, `ChatModels`). The server keeps no history, so every request carries the whole conversation as AI SDK `UIMessage`s, tool parts included: that is how the model finds the draft's id when you say "add Thursday". The reply is a server-sent-event stream (`APIClient.chat`); `ChatChunk` reads the `text-*` and `tool-*` events and ignores the rest. A tool call with no result is dropped before sending (the model rejects it). The conversation is saved in Application Support and wiped on sign-out. If the AI SDK is upgraded, re-check the chunk names against `node_modules/ai/dist/index.d.ts`.
- **iPad** runs the same app, with the tab bar along the top. Single-column tabs (Dashboard, Assistant, Account) centre their content with `readableScroll()` (`FormFields.swift`, 760pt) on the ScrollView or List itself: it uses content margins, so the scroll view stays full width and its scroll bar sits at the screen edge (capping the whole screen put the bar on the column's edge, over the cards). On a wide screen those screens draw their own title in the content (the navigation bar's large title would sit at the screen edge); pushed screens use `readableWidth()` inside their ScrollView. `readableColumn()` caps a whole screen and is no longer used by the tabs. **Invoices** is a `NavigationSplitView` (list left, selected invoice right) when the horizontal size class is regular, and a `NavigationStack` otherwise. Only the wide list takes a `selection` binding: on a phone one swallows the row's tap and the invoice never opens. New screens should use the column. **The invoice editor** opens as a full page on iPad (`presentationSizing(.page)`, iOS 18+; the system's form sheet before that) and, when its width is 860pt or more (landscape), lays out in two columns: the calendar on the left, and on the right the job, the live billing, expenses and notes, so the bill stays in view while days are painted. Narrower, it is one column capped at 720pt. **Assistant replies** are rendered by `MarkdownText.swift`, which splits the text into paragraphs, headings and bullet or numbered lists (SwiftUI's own Markdown has no lists); `MarkdownBlockTests` covers the parser, including half-finished streamed text.
- **Signing and the paid account.** The app is `com.stevemckinnon.caley` on team `X6J2X5D8W6` (a paid membership, so installs last a year, TestFlight works and entitlements are allowed). `Caley.entitlements` holds `webcredentials:caley.app`, which lets the password manager offer the saved caley.app login on the sign-in screen. It needs the web half: `/.well-known/apple-app-site-association` (`src/app/.well-known/…/route.ts`, built from `src/lib/app-association.ts`) must return `application/json` with no redirect, so `src/proxy.ts` exempts `.well-known` from the sign-in redirect (a test pins both). If the team or bundle ID changes, change it in the project **and** in `app-association.ts`. Apple caches the file, so a change can take a while to reach a phone; test on a device, not the simulator. `ITSAppUsesNonExemptEncryption` is false in `Info.plist` (HTTPS only), which skips the export-compliance question on every TestFlight upload. Bump `CURRENT_PROJECT_VERSION` for each upload. Account shows "Version 1.0 (build)" so you can tell which TestFlight build a device has, and the Server row only in debug builds.
- **Offline** (`OfflineCache.swift`): `APIClient.send` saves the server's raw response for the invoice list, each invoice, clients and profile (`DiskCache.isCacheable`; never the next invoice number, PDFs or POSTs), and when a GET fails with a no-connection `URLError` it serves the saved copy instead. `Connectivity.shared.servedFromCacheAt` drives the "Offline. Showing data saved …" banner (the tab bar's bottom accessory on iOS 26.1+) and clears the moment any request reaches the server; tapping the banner or the network returning reloads everything. Writes are not queued: they fail with "You're offline…" and roll back. Loading the list prefetches the 8 latest invoices so they open offline. Files are encrypted at rest, excluded from backup and wiped on sign-out. To test, load online, stop `pnpm dev`, relaunch.
- **Widgets** (`ios/Caley/CaleyWidgets/`, bundle `com.stevemckinnon.caley.widgets`): *Outstanding* (small home screen, plus lock screen circular, rectangular and inline), *Paid and owed* (small and medium home screen, lock screen rectangular and circular gauge: paid so far this tax year against outstanding, with a bar for the share paid; `WidgetSnapshot.paidShare` is paid over paid plus outstanding, drafts excluded; tap opens the dashboard) and *This tax year* (medium: invoiced, paid, outstanding and the three latest invoices) and *New invoice* (small, lock screen circular). Code both targets need lives in `ios/Caley/Shared/` (a synchronized group in both targets): `Models`, `Formatting`, `Config`, `Keychain`, `DashboardSummary` (the dashboard's rules: one currency, UK tax year, outstanding = sent + overdue; the dashboard and widgets both use it) and `WidgetData` (`WidgetSnapshot` and `SharedStore`). The widget **fetches its own numbers** (`GET /api/invoices`, every ~30 minutes, a hint to the system) with the app's bearer token, which lives in a **shared keychain group** (`<team>.com.stevemckinnon.caley.shared`, set in both entitlements and as `CaleyKeychainGroup` in both Info.plists; `Keychain.read()` moves a pre-widget token into it on the first launch). Offline it falls back to the last `WidgetSnapshot` saved in the **app group** `group.com.stevemckinnon.caley` (which the app also writes after every load or change, via `WidgetSync`, and clears on sign-out). **With the Face ID lock on, widgets show counts but dots for amounts** (and Paid and owed hides its bar and percentage too, since a ratio is financial information): they sit on home and lock screens and can't ask for Face ID (the app mirrors the setting into the app group). Taps open `caley://invoices[?filter=overdue]`, `caley://invoice/<id>`, `caley://dashboard` or `caley://new` (`AppNavigation.handle`; the screens consume the pending state themselves, since a cold launch from a widget reaches the link before they exist). The widget's `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` must match the app's, or the upload is rejected. To test in the simulator: build, install the **`com.stevemckinnon.caley`** app (not the old `.dev`), sign in, then long-press the home screen, Add Widget, Caley. `simctl openurl caley://…` works too (it asks "Open in Caley?").
- **Siri, Shortcuts and the Action button** (`Caley/Intents.swift`, App Intents, no setup needed by the user): *What am I owed?* (speaks outstanding, the invoice count and how many are overdue; fetches live through `InvoiceFetcher`, falls back to the saved widget snapshot offline), *New invoice* and *Show overdue invoices* (both open the app via the same `caley://` links the widgets use). Phrases are in `CaleyShortcuts`; they must contain `\(.applicationName)`, and a malformed one is dropped silently, so after editing check `Metadata.appintents/extract.actionsdata` in the built app. **Privacy:** *What am I owed?* needs the device unlocked (`.requiresLocalDeviceAuthentication`) and, with the app's Face ID lock on, speaks counts and never amounts (`WidgetSnapshot.owedSentence`). `LinkBridge` holds a link that arrives before the app's screens exist (a cold launch from the Action button), and `CaleyApp.open` waits for the saved login to be checked before navigating (this also fixes links dropped on a cold launch). To use the Action button: Settings → Action Button → Shortcut → choose Caley's *New invoice*. To test in the simulator: Shortcuts app → New Shortcut → Edit → the Caley app's actions → run. The fetch code is shared with the widgets (`Shared/InvoiceFetcher.swift`).
- **App lock** (`AppLock.swift`) is optional, off by default, set in Account. It uses `.deviceOwnerAuthentication` (Face ID, falling back to the passcode), asks on a cold launch and after 30 seconds away, and `LockView` also covers the app whenever it isn't the active scene so the app-switcher snapshot shows no invoices. Turning it on needs one successful check, so it can't lock you out. To test in the simulator, enrol first (`xcrun simctl spawn <udid> notifyutil -s com.apple.BiometricKit.enrollmentChanged 1`, then `-p` it), and send a match only **after** the prompt is showing (`notifyutil -p com.apple.BiometricKit_Sim.pearl.match`); an early match is ignored.
- **Share and mark as sent**: on a draft the ⋯ menu's share item reads "Share and mark as sent". When the share sheet reports that something was actually done with the PDF (sent, saved, copied; `completionWithItemsHandler`), the draft becomes sent through the normal optimistic status change, and a "Marked as sent · Undo" notice shows for 7 seconds (Undo puts it back to draft). Dismissing the sheet changes nothing, and invoices that are already sent, paid or overdue keep their status (`InvoiceStatus.afterSharing`). Note the share sheet can't tell *what* was done, so "Copy" counts. To test in the simulator, wait about 2 seconds after the action before tapping Undo: the notice appears once the save returns.
- **Chase-up reminders** (`Reminders.swift`, off by default, a switch in Account): local notifications, no server and no push. `ReminderPlanner` (pure, tested) turns the invoice list into reminders: a **sent** invoice gets one at 9am 30 days after its date, then weekly for four; an **overdue** invoice, or a sent one already past 30 days, gets Monday 9am nudges (three). Drafts and paid invoices get none, and the plan is capped at 60 (iOS keeps 64 pending). `Reminders.sync` rebuilds everything (remove ours, re-add) after every live list load, status change and delete, so a paid invoice stops nagging the next time the app runs; a change made on the web reaches them when the app next opens, or sooner through `BackgroundRefresh` (a `BGAppRefreshTask`, `com.stevemckinnon.caley.refresh`, permitted in `Info.plist` with the `fetch` background mode): it is scheduled for six hours after the app goes to the background (and each time it runs), fetches the invoices with the saved login, and rebuilds the reminders and the widget snapshot, so a reminder stops once an invoice is paid elsewhere. iOS decides when and how often it really runs (more often the more you use the app), so treat it as best effort; to try it, run `e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.stevemckinnon.caley.refresh"]` in the debugger. With the Face ID lock on, the text carries the age but no amount (`SharedStore.hideAmounts`; `AppLock` calls `Reminders.refresh()`). A tap opens `caley://invoice/<id>` through `LinkBridge`, and `Reminders.install()` sets the delegate in `CaleyApp.init` so a cold launch from a notification is routed. Sign-out clears them. Permission is asked when the switch is first turned on; if refused, an alert offers Settings. The system calls are wrapped in continuations, as in `AppLock`. In the simulator the prompt can take several seconds to appear.
- **Add from calendar** (`CalendarImport.swift`, `CalendarImportView.swift`): a button under the editor's calendar opens a sheet listing the dates that have events in the phone's calendar (EventKit, read-only, `NSCalendarsFullAccessUsageDescription` in `Info.plist`). It starts around the painted days, else the four weeks before the invoice date; a title filter ("Triplemania") skips dentist appointments, every found date is ticked, and Add paints them as **work days**. A **Calendars** row (shown when there are several) limits it to the calendars you keep work in, and the choice is remembered; holiday, birthday and subscribed calendars are never read, since they are full of all-day events that aren't work. Adding days also fills an empty job name with a suggestion from the picked events (`CalendarImport.suggestedName`: the title that repeats, else the shared leading words, so "Triplemania day 1" and "day 2" give "Triplemania"). Dates already painted keep what they are (`CalendarImport.filling`), so travel, dark days and overtime are never overwritten. Multi-day events cover each date, and a timed event ending at midnight stays on its own day. The calendar only suggests dates: the server still prices whatever is saved. The permission request uses a continuation, as in `AppLock`. To test in the simulator it needs events: grant with `xcrun simctl privacy <udid> grant calendar com.stevemckinnon.caley` and add some in the Calendar app. If another project is listening on `[::1]:3000`, the simulator's `localhost` reaches that instead of `pnpm dev`; set `debugServerURL` to `http://127.0.0.1:3000` with `simctl spawn <udid> defaults write com.stevemckinnon.caley debugServerURL …`.
- **Delete and duplicate** live in the invoice's ⋯ menu. Delete asks first and works on any status (the API allows it). Duplicate opens the editor with the client, job name, notes and expenses and the next number, but **no days** (they'd be the old job's dates), and works on count-based invoices too since the copy is day-based.
- **Dashboard follows the web rules**: one currency at a time (picker only if several), UK tax year via `DateOnly.fyStart`, outstanding = sent + overdue.
- **Targets** — The simulator talks to `http://localhost:3000` (allowed by `NSAllowsLocalNetworking` in `Info.plist`); devices and Release builds talk to https://caley.app (`Config.swift`). Seed login is the one in "Local development database".
- **Project** is hand-written with a file-system-synchronised group, so new `.swift` files under `ios/Caley/Caley/` are picked up without editing the `.pbxproj`. Signing is the developer's own (a Personal Team and a `.dev` bundle ID set in Xcode), so expect those two lines to be specific to whoever last signed it.
- **Simulator builds must be ad-hoc signed.** The Keychain needs an entitlement; an unsigned build (`CODE_SIGNING_ALLOWED=NO`) silently fails to save the token, so the app signs you out on every relaunch. Build with `xcodebuild -project ios/Caley/Caley.xcodeproj -scheme Caley -destination 'id=<simulator udid>' CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM= CODE_SIGNING_ALLOWED=YES build`. Debug builds print `Keychain: saving the token failed …` if it still happens.
- **Launch screen** is `UILaunchScreen` in `Info.plist` (the `LaunchBackground` colour and `LaunchMark` image from the asset catalog, light and dark), not a generated one. `LaunchView` (`CaleyApp.swift`) draws the same mark at the same size while the saved login is checked, so launch reads as one screen. Change the mark or canvas colour in both places. The simulator caches launch screens, so uninstall the app before checking a change.
- **Running on a device** needs a signing team (a free Apple ID works; the install expires after 7 days). A phone talks to production, https://caley.app, in Debug and Release alike; only the simulator defaults to `http://localhost:3000` (`Config.swift`). To use the Mac's dev server from a phone, long-press the wordmark on the sign-in screen (Debug builds only), enter the Mac's IP (`192.168.x.x:3000`) and tap Test connection, which reports the real error. If a device can't reach a local server, check Settings → Caley → Local Network is on; plain HTTP only works for IP addresses and `.local` names.

### CI and production safeguards

- **CI** (`.github/workflows/ci.yml`) runs lint, typecheck and the full test suite on every push to `main` and every PR, against a throwaway `postgres:17` service on the same port as `compose.yaml`, so the database-backed tests run rather than skip.
- **Rate limiting** — `/api/chat` allows 20 requests per 10 minutes and 200 per day per user (`CHAT_RATE_LIMITS` in the route). Counters live in the `RateLimit` table (`src/lib/rate-limit.ts`), one atomic upsert per window, so they hold across serverless instances. A 429 returns JSON that `ChatContent` shows as a plain notice instead of the error box.

### Environment Variables

- `ANTHROPIC_API_KEY` — Anthropic API key for the AI chat feature
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — session encryption secret (32+ chars)
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — canonical app URL
- `RESEND_API_KEY` — email sending (password reset); optional in dev (link logged to console)
- `EMAIL_FROM` — sender address (`onboarding@resend.dev` works for dev)
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry error reporting. Optional: without it Sentry is inert, and it only ever reports from production builds. Options live in `src/lib/sentry-options.ts`; Session Replay is deliberately off because invoice views show banking details
- `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` — build-time only, for uploading source maps. Without the token the upload is skipped
