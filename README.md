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
- PostgreSQL database
- [Resend](https://resend.com) account (for email functionality)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd invoice-app
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

- `DATABASE_URL`: Your PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Random 32+ character string for session encryption
- `RESEND_API_KEY`: Your Resend API key from [resend.com/api-keys](https://resend.com/api-keys)
- `EMAIL_FROM`: Verified sender email (use `onboarding@resend.dev` for testing)

4. Run database migrations:

```bash
pnpm db:migrate
```

5. Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Email Setup

This app uses [Resend](https://resend.com) for sending password reset emails:

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add it to your `.env.local` as `RESEND_API_KEY`
4. For production: verify your domain and use your domain email as `EMAIL_FROM`
5. For development: use `onboarding@resend.dev` (no verification needed)

### Database Commands

```bash
# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Push schema changes (development)
pnpm db:push
```

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
