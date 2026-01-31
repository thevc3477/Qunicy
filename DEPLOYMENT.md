# Quincy Deployment Guide

This guide covers deploying the Quincy app with Supabase backend and Spotify integration.

## Prerequisites

- Node.js 18+ installed
- Supabase account and project created
- Spotify Developer account
- Supabase CLI installed: `npm install -g supabase`

## 1. Supabase Setup

### Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Note your **Project URL** and **Anon Key**

### Configure Environment Variables

Create `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Set Up Database Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top_albums TEXT[],
  top_genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

## 2. Spotify API Setup

### Get Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in app details:
   - App Name: "Quincy"
   - App Description: "Vinyl collector community app"
   - Redirect URIs: **Leave empty** (we use Client Credentials flow)
4. Click **Create**
5. Copy your **Client ID** and **Client Secret**

### Configure Spotify Secrets in Supabase

**IMPORTANT**: Never add these to `.env` files!

Using Supabase CLI:
```bash
# Link your project first
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set SPOTIFY_CLIENT_ID=your_spotify_client_id
supabase secrets set SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

Or via Supabase Dashboard:
1. Project Settings > Edge Functions > Secrets
2. Add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`

## 3. Deploy Edge Function

### Deploy Spotify Search Function

```bash
# From project root
supabase functions deploy spotify-search
```

### Verify Deployment

```bash
# Test the function
curl "https://your-project.supabase.co/functions/v1/spotify-search?q=thriller"
```

You should get a JSON response with album results.

## 4. Configure Authentication

### Enable Email Authentication

1. In Supabase Dashboard: **Authentication** > **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)

### Disable Email Confirmation (Development Only)

For local development, you can disable email confirmation:
1. **Authentication** > **Settings**
2. Disable "Enable email confirmations"

**Production**: Re-enable email confirmations and configure SMTP

## 5. Local Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

App will be available at `http://localhost:5173`

### Test Locally with Supabase Functions

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve spotify-search

# Update .env with local URLs
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

## 6. Production Deployment

### Deploy Frontend

**Option A: Vercel**
```bash
npm install -g vercel
vercel
```

**Option B: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Environment Variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your hosting platform

### Production Checklist

- [ ] Supabase production database created
- [ ] Spotify secrets configured in Supabase
- [ ] Edge function deployed
- [ ] Email confirmations enabled
- [ ] Environment variables set on hosting platform
- [ ] Test user signup flow
- [ ] Test album search
- [ ] Test profile creation

## Troubleshooting

### Album Search Not Working

1. Check Edge Function logs:
   ```bash
   supabase functions logs spotify-search
   ```

2. Verify secrets are set:
   ```bash
   supabase secrets list
   ```

3. Test Spotify credentials manually:
   ```bash
   curl -X POST "https://accounts.spotify.com/api/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET"
   ```

### Authentication Issues

1. Check Supabase auth logs in Dashboard
2. Verify `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Clear browser cookies and try again

### Database Errors

1. Check table exists: `SELECT * FROM profiles LIMIT 1;`
2. Verify RLS policies are set up correctly
3. Check user ID matches: `SELECT auth.uid();`

## Security Best Practices

✅ **DO:**
- Store Spotify credentials in Supabase Edge Function secrets
- Use Row Level Security on all database tables
- Enable email confirmations in production
- Use HTTPS in production

❌ **DON'T:**
- Commit `.env` files to Git (add to `.gitignore`)
- Expose Spotify credentials in frontend code
- Disable RLS in production
- Use development credentials in production

## Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
