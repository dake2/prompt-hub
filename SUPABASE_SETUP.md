# Supabase Setup Guide

This guide explains how to set up the Supabase backend for the AI Prompt Market application.

## Prerequisites

1. A Supabase account - create one at https://supabase.com
2. This project with Supabase dependencies installed (`@supabase/supabase-js`)

## Setup Steps

### 1. Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Enter project name (e.g., "ai-prompt-market")
4. Set a database password (save it securely)
5. Choose a region closest to your users
6. Wait for the project to be created (~2 minutes)

### 2. Get Your API Credentials

1. In your Supabase dashboard, go to **Project Settings** → **API**
2. Copy the **Project URL** (looks like `https://xyz.supabase.co`)
3. Copy the **anon public** API key

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Run the SQL Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the query

This will create:
- `profiles` table (user metadata and roles)
- `prompts` table (prompt data)
- `votes` table (user votes)
- Row Level Security (RLS) policies
- Triggers for auto-creating profiles
- Helper functions and views

### 5. Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Make sure "Email" provider is enabled
3. Optionally configure:
   - Email confirmation settings
   - SMTP settings for production

### 6. (Optional) Create an Admin User

Run this in the SQL Editor to create your first admin user:

```sql
-- First, sign up through the UI to create your user account
-- Then get your user ID from the profiles table and update role:

UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

Or use the Supabase CLI:

```bash
# Create admin user via auth
supabase auth signup --email admin@example.com --password your-password

# Update role
supabase db execute "UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';"
```

## Database Schema

### Tables

#### `profiles`
Stores user profile information and roles.
- `id` (UUID, PK) - References auth.users
- `email` (TEXT)
- `name` (TEXT)
- `role` (TEXT) - 'user' or 'admin'
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `prompts`
Stores AI prompts.
- `id` (UUID, PK)
- `title` (TEXT)
- `description` (TEXT)
- `content` (TEXT)
- `category` (TEXT)
- `tags` (TEXT[])
- `upvotes` (INTEGER)
- `downvotes` (INTEGER)
- `published` (BOOLEAN)
- `author_id` (UUID, FK → profiles.id)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `votes`
Stores user votes on prompts.
- `id` (UUID, PK)
- `user_id` (UUID, FK → profiles.id)
- `prompt_id` (UUID, FK → prompts.id)
- `vote_type` (TEXT) - 'up' or 'down'
- `created_at` (TIMESTAMP)

## RLS Policies

The following policies are enforced:

### Prompts Table
- Public can read published prompts
- Authors can read their own prompts (including unpublished)
- Authors can create prompts
- Authors can update their own prompts
- Admins can update any prompt
- Authors can delete their own prompts
- Admins can delete any prompt

### Profiles Table
- Public can read profiles (for author info)
- Users can update their own profile

### Votes Table
- Users can vote on prompts (their own votes only)

## Permission Matrix

| Action           | Guest | User | Admin |
| ---------------- | ------ | ---- | ----- |
| View published   | ✅    | ✅   | ✅    |
| Create prompt    | ❌    | ✅   | ✅    |
| Edit own prompt  | ❌    | ✅   | ✅    |
| Edit any prompt  | ❌    | ❌   | ✅    |
| Publish/Unpublish| ❌    | ✅   | ✅    |
| Delete own prompt| ❌    | ✅   | ✅    |
| Delete any prompt| ❌    | ❌   | ✅    |
| Vote            | ❌    | ✅   | ✅    |

## Running the Application

After setup, run:

```bash
npm run dev
```

The app will:
- Detect if Supabase is configured
- Use Supabase backend if credentials are present
- Fall back to mock mode if not configured

## Troubleshooting

### "Supabase not configured" warning
Check that:
1. `.env` file exists
2. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
3. Restart the dev server after creating `.env`

### RLS errors
Ensure you've run the migration SQL to create policies.

### Vote errors
Make sure you're logged in - voting requires authentication.

## Next Steps

1. **Seed data**: Add sample prompts through the UI or SQL
2. **Customize**: Adjust RLS policies for your needs
3. **Deploy**: Configure CORS for your production domain in Supabase
4. **Monitor**: Check Supabase logs for errors

## Migration File Location

The full SQL schema is at: `supabase/migrations/001_initial_schema.sql`
