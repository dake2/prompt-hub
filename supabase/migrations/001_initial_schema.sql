-- ============================================
-- Enable required extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Create profiles table (stores user metadata and role)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- Create prompts table
-- ============================================
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- Create votes table (for user vote tracking)
-- ============================================
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, prompt_id)
);

-- ============================================
-- Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_prompts_author_id ON public.prompts(author_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON public.prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_published ON public.prompts(published);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_prompt_id ON public.votes(prompt_id);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for profiles table
-- ============================================

-- Public can read profiles (for author info)
CREATE POLICY "public read profiles"
ON public.profiles
FOR SELECT
USING (true);

-- Users can insert their own profile (trigger handles this)
CREATE POLICY "user insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "user update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- RLS Policies for prompts table
-- ============================================

-- Public can read published prompts
CREATE POLICY "public read published prompts"
ON public.prompts
FOR SELECT
USING (published = true);

-- Authors can read their own prompts (including unpublished)
CREATE POLICY "author read own prompts"
ON public.prompts
FOR SELECT
USING (auth.uid() = author_id);

-- Authors can insert prompts
CREATE POLICY "author insert prompts"
ON public.prompts
FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Authors can update their own prompts
CREATE POLICY "author update own prompt"
ON public.prompts
FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Admins can update any prompt
CREATE POLICY "admin update any prompt"
ON public.prompts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- Authors can delete their own prompts
CREATE POLICY "author delete own prompt"
ON public.prompts
FOR DELETE
USING (auth.uid() = author_id);

-- Admins can delete any prompt
CREATE POLICY "admin delete any prompt"
ON public.prompts
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- ============================================
-- RLS Policies for votes table
-- ============================================

-- Users can vote on prompts
CREATE POLICY "user vote"
ON public.votes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::TEXT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on new user
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON public.prompts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Views for convenience
-- ============================================

-- View that includes user's vote status for prompts
CREATE OR REPLACE VIEW public.prompts_with_user_vote AS
SELECT
  p.*,
  COALESCE(
    (SELECT v.vote_type FROM public.votes v
     WHERE v.prompt_id = p.id AND v.user_id = auth.uid()),
    NULL
  ) as user_vote
FROM public.prompts p;

-- ============================================
-- Grant necessary permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
