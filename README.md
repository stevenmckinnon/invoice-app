# Caley

A modern invoice management application built with Next.js, Prisma, and Better Auth.

## Features

- 🔐 Authentication with email/password and password reset
- 📧 Email notifications via Resend
- 💼 Invoice creation and management
- 📊 Dashboard with analytics
- 🎨 Modern UI with dark mode support
- 📱 Responsive design

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (runs the local development database)
- [Anthropic API key](https://console.anthropic.com) (for the AI assistant)
- [Resend](https://resend.com) account (optional in development — reset links are logged to the console)

### Installation

1. Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd invoice-app
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your values:

- `BETTER_AUTH_SECRET`: Random 32+ character string for session encryption
- `ANTHROPIC_API_KEY`: Your key from [console.anthropic.com](https://console.anthropic.com)
- `RESEND_API_KEY`: Your Resend API key from [resend.com/api-keys](https://resend.com/api-keys)
- `EMAIL_FROM`: Verified sender email (use `onboarding@resend.dev` for testing)
- `DATABASE_URL`: only needed if you're pointing at a hosted database — the local setup below supplies its own

3. Start the database and seed it:

```bash
pnpm db:local:up   # starts postgres in Docker and pushes the schema
pnpm db:seed       # creates a user, clients and sample invoices
```

4. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with:

```
dev@caley.test / devpassword123
```

## Local development database

The app runs against a postgres container defined in [`compose.yaml`](compose.yaml) rather than a hosted database, so ordinary development can't touch production data.

```bash
pnpm db:local:up     # start the container and push the current schema
pnpm db:local:down   # stop it (data survives in a named volume)
pnpm db:local:reset  # wipe the volume, recreate, push schema, reseed
pnpm db:seed         # reseed without wiping
```

### How the connection is chosen

`.env.local` sets `DATABASE_URL` to the container and is read **ahead of** `.env` by Next.js, the Prisma CLI (via `prisma.config.ts`) and `pnpm test`. All three must stay in agreement — if only some of them read `.env.local`, `pnpm dev` runs against the local database while `pnpm db:push` rewrites the hosted one.

To work against a hosted database instead, comment out `DATABASE_URL` in `.env.local`. Everything else still comes from `.env` either way.

### What gets seeded

[`prisma/seed.ts`](prisma/seed.ts) creates one user (through Better Auth, so the password actually works), three clients — one with tiered overtime, one without, one with no rates at all — and five invoices spanning every status. Invoice totals are computed with the same `calculateInvoiceTotals` helper the PDF uses, so seeded rows can't disagree with what the app renders.

Re-running is safe: the seeded user is deleted first and everything else cascades. The script **refuses to run against a non-local host**, since it deletes data (override with `SEED_ALLOW_REMOTE=1` if you genuinely mean it).

> **Use `db:push`, not `db:migrate`, on a fresh database.** `20250116000000_add_client_model` sorts before `20251014163218_init_postgres` but references `Invoice`, so replaying the migration history from empty fails immediately. `db:local:up` uses `db:push` for this reason. Existing databases are unaffected — `db:migrate` still applies new migrations there.

### Email Setup

This app uses [Resend](https://resend.com) for sending password reset emails:

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add it to your `.env.local` as `RESEND_API_KEY`
4. For production: verify your domain and use your domain email as `EMAIL_FROM`
5. For development: use `onboarding@resend.dev` (no verification needed)

### Database Commands

```bash
# Generate Prisma client (dev and build do this automatically)
pnpm prisma generate

# Push schema changes without a migration
pnpm db:push

# Apply pending migrations to an existing database
pnpm db:migrate

# Browse the data
pnpm db:studio
```

These act on whichever database `.env.local` / `.env` resolves to — the local container by default.

### Tests

```bash
pnpm test
```

Node's built-in test runner via `tsx`. The schema and pricing tests are pure and always run; the tests that exercise the AI tools against real rows need `TEST_DATABASE_URL` and **skip without it** rather than falling back to `DATABASE_URL`. `.env.local` points it at the local container, so `pnpm test` runs everything once the database is up.

### Email Assets

The email templates use a PNG logo for better email client compatibility:

- `public/email-logo.png` - 128x128px WWE logo with red background
- `public/email-logo.svg` - SVG source file

To regenerate the email logo (if brand colors change):

```bash
npx tsx scripts/generate-email-logo.ts
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
