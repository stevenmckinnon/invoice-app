# Authentication Setup

Your invoice app now has full authentication! Here's how to set it up:

## Quick Start (Email-only auth)

1. **Generate a secret key:**
   ```bash
   openssl rand -base64 32
   ```

2. **Add to your `.env` file:**
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<paste-the-generated-secret-here>
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

4. **Sign in:**
   - Visit `http://localhost:3000`
   - You'll be redirected to the sign-in page
   - Enter any email address
   - You're now logged in!

## Optional: Add OAuth Providers

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### GitHub OAuth

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and generate Client Secret
5. Add to `.env`:
   ```env
   GITHUB_ID=your-github-id
   GITHUB_SECRET=your-github-secret
   ```

## Features

✅ **Email Authentication** - Simple email-based login (no password needed for demo)
✅ **OAuth Providers** - Google and GitHub sign-in
✅ **Protected Routes** - All invoice pages require authentication
✅ **User Profiles** - User dropdown in header
✅ **Secure API** - All API endpoints check authentication
✅ **Multi-user** - Each user sees only their own invoices
✅ **Session Management** - JWT-based sessions

## What's Protected

- Dashboard (`/`)
- Create Invoice (`/invoices/new`)
- Edit Invoice (`/invoices/[id]/edit`)
- View Invoice (`/invoices/[id]`)
- All API endpoints

## Public Routes

- Sign In page (`/auth/signin`)
- Auth API (`/api/auth/*`)

Enjoy your secure invoice management system! 🔐

