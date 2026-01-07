import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Prompt,
  CreatePromptInput,
  UpdatePromptInput,
  Category,
  LoginInput,
  RegisterInput,
  CurrentUser,
} from '@/types/prompt';

// ============================================
// Auth Service
// ============================================

export const authService = {
  // Get current user
  getCurrentUser: async (): Promise<CurrentUser | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      name: profile?.name || user.user_metadata?.name || user.email || '',
      role: profile?.role || 'user',
    };
  },

  // Sign in with email/password
  signIn: async (input: LoginInput): Promise<CurrentUser> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) throw error;

    const user = data.user;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      name: profile?.name || user.user_metadata?.name || user.email || '',
      role: profile?.role || 'user',
    };
  },

  // Sign up with email/password
  signUp: async (input: RegisterInput): Promise<CurrentUser> => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name,
        },
      },
    });

    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error('Failed to create user');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      name: profile?.name || input.name || input.email,
      role: profile?.role || 'user',
    };
  },

  // Sign out
  signOut: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: (user: CurrentUser | null) => void) => {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await authService.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  },
};

// ============================================
// Prompts Service
// ============================================

export const promptsService = {
  // Get all published prompts (for public/guest view)
  getPublishedPrompts: async (userId?: string): Promise<Prompt[]> => {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('prompts')
      .select(`
        *,
        profiles!inner (
          name
        )
      `)
      .eq('published', true)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return data.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      content: p.content,
      category: p.category,
      tags: p.tags || [],
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      author: p.profiles.name,
      createdAt: p.created_at,
      userVote: p.user_vote,
    }));
  },

  // Get prompts by category
  getPromptsByCategory: async (category: string, userId?: string): Promise<Prompt[]> => {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('prompts')
      .select(`
        *,
        profiles!inner (
          name
        )
      `)
      .eq('published', true);

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return data.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      content: p.content,
      category: p.category,
      tags: p.tags || [],
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      author: p.profiles.name,
      createdAt: p.created_at,
      userVote: p.user_vote,
    }));
  },

  // Search prompts
  searchPrompts: async (query: string, userId?: string): Promise<Prompt[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('prompts')
      .select(`
        *,
        profiles!inner (
          name
        )
      `)
      .eq('published', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      content: p.content,
      category: p.category,
      tags: p.tags || [],
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      author: p.profiles.name,
      createdAt: p.created_at,
      userVote: p.user_vote,
    }));
  },

  // Get user's own prompts (including unpublished)
  getUserPrompts: async (userId: string): Promise<Prompt[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      content: p.content,
      category: p.category,
      tags: p.tags || [],
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      author: 'Me',
      createdAt: p.created_at,
      userVote: null,
    }));
  },

  // Get single prompt by ID
  getPromptById: async (promptId: string): Promise<Prompt | null> => {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('prompts')
      .select(`
        *,
        profiles!inner (
          name
        )
      `)
      .eq('id', promptId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      upvotes: data.upvotes,
      downvotes: data.downvotes,
      author: data.profiles.name,
      createdAt: data.created_at,
      userVote: data.user_vote,
    };
  },

  // Create a new prompt
  createPrompt: async (input: CreatePromptInput, authorId: string): Promise<Prompt> => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('prompts')
      .insert({
        title: input.title,
        description: input.description,
        content: input.content,
        category: input.category,
        tags: input.tags,
        published: input.published,
        author_id: authorId,
      })
      .select(`
        *,
        profiles!inner (
          name
        )
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      upvotes: data.upvotes,
      downvotes: data.downvotes,
      author: data.profiles.name,
      createdAt: data.created_at,
      userVote: null,
    };
  },

  // Update a prompt
  updatePrompt: async (input: UpdatePromptInput, userId: string): Promise<Prompt> => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('prompts')
      .update({
        title: input.title,
        description: input.description,
        content: input.content,
        category: input.category,
        tags: input.tags,
        published: input.published,
      })
      .eq('id', input.id)
      .select(`
        *,
        profiles!inner (
          name
        )
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      content: data.content,
      category: data.category,
      tags: data.tags || [],
      upvotes: data.upvotes,
      downvotes: data.downvotes,
      author: data.profiles.name,
      createdAt: data.created_at,
      userVote: null,
    };
  },

  // Delete a prompt
  deletePrompt: async (promptId: string): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', promptId);

    if (error) throw error;
  },

  // Toggle published status
  togglePublished: async (promptId: string, userId: string): Promise<Prompt> => {
    const prompt = await promptsService.getPromptById(promptId);
    if (!prompt) throw new Error('Prompt not found');

    return promptsService.updatePrompt(
      {
        id: promptId,
        title: prompt.title,
        description: prompt.description,
        content: prompt.content,
        category: prompt.category,
        tags: prompt.tags,
        published: !prompt.published,
      },
      userId
    );
  },
};

// ============================================
// Votes Service
// ============================================

export const votesService = {
  // Vote on a prompt
  vote: async (promptId: string, voteType: 'up' | 'down', userId: string): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', userId)
      .eq('prompt_id', promptId)
      .single();

    if (existingVote) {
      // Remove existing vote
      await supabase
        .from('votes')
        .delete()
        .eq('user_id', userId)
        .eq('prompt_id', promptId);

      // Update prompt counts
      const { data: prompt } = await supabase
        .from('prompts')
        .select('upvotes, downvotes')
        .eq('id', promptId)
        .single();

      if (prompt) {
        await supabase
          .from('prompts')
          .update({
            upvotes: existingVote.vote_type === 'up' ? prompt.upvotes - 1 : prompt.upvotes,
            downvotes: existingVote.vote_type === 'down' ? prompt.downvotes - 1 : prompt.downvotes,
          })
          .eq('id', promptId);
      }

      // If same vote type, just remove (toggle off)
      if (existingVote.vote_type === voteType) {
        return;
      }
    }

    // Add new vote
    await supabase.from('votes').insert({
      user_id: userId,
      prompt_id: promptId,
      vote_type: voteType,
    });

    // Update prompt counts
    const { data: prompt } = await supabase
      .from('prompts')
      .select('upvotes, downvotes')
      .eq('id', promptId)
      .single();

    if (prompt) {
      await supabase
        .from('prompts')
        .update({
          upvotes: voteType === 'up' ? prompt.upvotes + 1 : prompt.upvotes,
          downvotes: voteType === 'down' ? prompt.downvotes + 1 : prompt.downvotes,
        })
        .eq('id', promptId);
    }
  },

  // Get user's vote on a prompt
  getUserVote: async (promptId: string, userId: string): Promise<'up' | 'down' | null> => {
    if (!isSupabaseConfigured()) return null;

    const { data } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('user_id', userId)
      .eq('prompt_id', promptId)
      .single();

    return data?.vote_type || null;
  },
};

// ============================================
// Categories Service
// ============================================

export const categoriesService = {
  // Get all categories with prompt counts
  getCategories: async (): Promise<Category[]> => {
    if (!isSupabaseConfigured()) {
      // Return mock categories if Supabase not configured
      return [
        { id: 'all', name: 'All', icon: 'Grid3x3', count: 0 },
        { id: 'coding', name: 'Coding', icon: 'Code2', count: 0 },
        { id: 'writing', name: 'Writing', icon: 'FileText', count: 0 },
        { id: 'marketing', name: 'Marketing', icon: 'Megaphone', count: 0 },
        { id: 'productivity', name: 'Productivity', icon: 'Zap', count: 0 },
        { id: 'design', name: 'Design', icon: 'Palette', count: 0 },
      ];
    }

    const { data, error } = await supabase
      .from('prompts')
      .select('category')
      .eq('published', true);

    if (error) throw error;

    const categoryCounts = data.reduce((acc, prompt) => {
      acc[prompt.category] = (acc[prompt.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const baseCategories: Category[] = [
      { id: 'all', name: 'All', icon: 'Grid3x3', count: data.length },
      { id: 'coding', name: 'Coding', icon: 'Code2', count: categoryCounts['coding'] || 0 },
      { id: 'writing', name: 'Writing', icon: 'FileText', count: categoryCounts['writing'] || 0 },
      { id: 'marketing', name: 'Marketing', icon: 'Megaphone', count: categoryCounts['marketing'] || 0 },
      { id: 'productivity', name: 'Productivity', icon: 'Zap', count: categoryCounts['productivity'] || 0 },
      { id: 'design', name: 'Design', icon: 'Palette', count: categoryCounts['design'] || 0 },
    ];

    return baseCategories;
  },
};
