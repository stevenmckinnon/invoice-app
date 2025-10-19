# OAuth Setup Guide

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
APPLE_CLIENT_ID="your-apple-client-id"
APPLE_CLIENT_SECRET="your-apple-client-secret"
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set Application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy Client ID and Client Secret to your environment variables

## Apple OAuth Setup

1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Create a new App ID
4. Create a new Services ID for web authentication
5. Configure the Services ID with your domain
6. Create a private key for Sign in with Apple
7. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/apple` (development)
   - `https://yourdomain.com/api/auth/callback/apple` (production)
8. Copy Client ID and Client Secret to your environment variables

## Testing

1. Start your development server: `pnpm dev`
2. Visit `/auth/signin` or `/auth/signup`
3. Click "Continue with Google" or "Continue with Apple"
4. Complete the OAuth flow

## Production Deployment

Make sure to:
1. Update redirect URIs in OAuth provider settings
2. Set `NEXT_PUBLIC_APP_URL` to your production domain
3. Set `BETTER_AUTH_URL` to your production domain
4. Ensure all environment variables are set in your hosting platform
