// Database types matching Supabase schema
export interface DatabasePrompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  upvotes: number;
  downvotes: number;
  published: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
}

// Prompt with author name and user vote (from view)
export interface Prompt extends Omit<DatabasePrompt, 'author_id'> {
  author: string;
  userVote?: 'up' | 'down' | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// Profile types
export interface DatabaseProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Profile extends Omit<DatabaseProfile, 'id'> {
  id?: string;
}

export interface CurrentUser {
  id?: string;
  name: string;
  email: string;
  role?: 'user' | 'admin';
}

// Vote types
export interface DatabaseVote {
  id: string;
  user_id: string;
  prompt_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

// Form types
export interface CreatePromptInput {
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  published: boolean;
}

export interface UpdatePromptInput {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  published: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}
