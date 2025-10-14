# Quick Database Setup Guide

## Step-by-Step: Setting Up Neon PostgreSQL

### 1. Sign Up for Neon (2 minutes)
Go to: https://console.neon.tech/signup
- Sign up with GitHub (fastest)
- Or use email

### 2. Create Your Database (1 minute)
- Click "Create a project"
- Name: `invoice-app`
- Region: Choose closest to you
- Click "Create project"

### 3. Get Your Connection String
After creating the project, you'll see:
```
postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```
- Click the "Copy" button next to the connection string

### 4. Update Your .env.local
Open `.env.local` in your project and replace the DATABASE_URL line:

```bash
# Replace this entire line with your Neon connection string
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Keep these as they are
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=d7xVAkzKCYo445tgYs1wxL7e3nLNT257O/auxVzvcF0=
```

### 5. Run the Migration
In your terminal:
```bash
npx prisma migrate dev --name init_postgres
```

This will:
- Create all your tables in Neon
- Set up the database schema
- Generate Prisma Client

### 6. Start Your App
```bash
npm run dev
```

### 7. Test Everything
- Sign up with a new account
- Create an invoice
- Everything should work!

---

## Troubleshooting

### Error: "Can't reach database server"
- Check your internet connection
- Verify the connection string is correct
- Make sure you included `?sslmode=require` at the end

### Error: "Environment variable not found"
- Make sure `.env.local` file exists
- Restart your terminal/IDE
- Run `cat .env.local` to verify the content

### Database is empty after migration
- This is normal! Start fresh with your new PostgreSQL database
- Create a new user account
- All your data will be in the cloud database now

---

## Free Tier Limits

Neon Free Tier includes:
- ✅ 3GB storage
- ✅ Unlimited projects
- ✅ Automatic backups
- ✅ Perfect for development and small production apps

---

## Alternative: Local PostgreSQL with Docker

If you prefer a local database:

```bash
# Start PostgreSQL
docker-compose up -d

# Update .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invoiceapp"

# Run migration
npx prisma migrate dev --name init_postgres
```

---

## Next Steps After Database Setup

1. ✅ Database is set up
2. Test locally with `npm run dev`
3. Deploy to Vercel
4. Use the same Neon database for production
5. Add the DATABASE_URL to Vercel environment variables

Done! 🎉

