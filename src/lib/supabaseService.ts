import { supabase, supabaseAnonymous, isSupabaseConfigured } from './supabase';
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
    try {
      // Check if we have a session first
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session check:', session ? 'Has session' : 'No session');

      if (!session) {
        console.log('No active session found');
        return null;
      }

      // If we have a session but getUser fails, it might be expired
      // Try to refresh the session first
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      // Handle auth errors (401, etc.)
      if (authError) {
        console.error('Auth error details:', authError);
        if (authError.status === 401) {
          console.warn('Auth session expired or invalid, attempting refresh');

          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
            // Clear any stale session
            await supabase.auth.signOut();
            return null;
          }

          if (refreshData.user) {
            console.log('Session refreshed successfully');
            // Try getUser again with refreshed session
            const { data: { user: refreshedUser } } = await supabase.auth.getUser();
            if (!refreshedUser) return null;

            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', refreshedUser.id)
              .single();

            return {
              id: refreshedUser.id,
              email: refreshedUser.email || '',
              name: profile?.name || refreshedUser.user_metadata?.name || refreshedUser.email || '',
              role: profile?.role || 'user',
            };
          }
        }
        console.error('Auth error:', authError);
        return null;
      }

      if (!user) {
        console.log('No user data returned from getUser()');
        return null;
      }

      console.log('Successfully got user:', user.id);

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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Auth request was aborted (likely due to timeout)');
        return null;
      }
      console.error('Error getting current user:', error);
      return null;
    }
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
        try {
          const user = await authService.getCurrentUser();
          callback(user);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.warn('Auth state change request was aborted');
            callback(null);
          } else {
            console.error('Error getting current user:', error);
            callback(null);
          }
        }
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
  getPublishedPrompts: async (): Promise<Prompt[]> => {
    if (!isSupabaseConfigured()) return [];

    try {
      // Add timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      // For public view, we only show published prompts
      // Use the anonymous client to avoid auth issues
      const query = supabaseAnonymous
        .from('prompts')
        .select(`
          id,
          title,
          description,
          content,
          category,
          tags,
          upvotes,
          downvotes,
          created_at,
          author_id,
          published
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      const { data, error } = await query;

      clearTimeout(timeoutId);

      if (error) {
        // Handle RLS or permission errors
        if (error.code === '42501' || error.code === 'PGRST116') {
          console.warn('Access denied to prompts table - check RLS policies');
          return [];
        }
        if (error.status === 401) {
          console.warn('Unauthorized access to prompts - session may be expired');
          return [];
        }
        throw error;
      }

      // For anonymous users, we need to get author names separately or use a default
      const promptsWithAuthor = data.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        content: p.content,
        category: p.category,
        tags: p.tags || [],
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        author: 'Anonymous', // Default for anonymous access
        createdAt: p.created_at,
        userVote: null, // Anonymous users don't have votes
      }));

      return promptsWithAuthor;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Prompts request was aborted (likely due to timeout)');
        return [];
      }
      console.error('Error fetching prompts:', error);
      return [];
    }
  },

  // Get prompts with user-specific data (for authenticated users)
  getPublishedPromptsForUser: async (userId: string): Promise<Prompt[]> => {
    if (!isSupabaseConfigured() || !userId) return [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const query = supabase
        .from('prompts')
        .select(`
          *,
          profiles!inner (
            name
          ),
          votes!user_vote (
            vote_type
          )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      const { data, error } = await query;

      clearTimeout(timeoutId);

      if (error) {
        if (error.code === '42501' || error.code === 'PGRST116') {
          console.warn('Access denied to prompts table');
          return [];
        }
        throw error;
      }

      return data.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        content: p.content,
        category: p.category,
        tags: p.tags || [],
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        author: p.profiles?.name || 'Anonymous',
        createdAt: p.created_at,
        userVote: p.votes?.[0]?.vote_type || null,
      }));
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Prompts request was aborted');
        return [];
      }
      console.error('Error fetching user prompts:', error);
      return [];
    }
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

  // Search prompts (anonymous friendly)
  searchPrompts: async (query: string): Promise<Prompt[]> => {
    if (!isSupabaseConfigured()) return [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const { data, error } = await supabaseAnonymous
        .from('prompts')
        .select(`
          id,
          title,
          description,
          content,
          category,
          tags,
          upvotes,
          downvotes,
          created_at
        `)
        .eq('published', true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        if (error.code === '42501' || error.code === 'PGRST116') {
          console.warn('Access denied to prompts table for search');
          return [];
        }
        if (error.status === 401) {
          console.warn('Unauthorized search access');
          return [];
        }
        throw error;
      }

      return data.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        content: p.content,
        category: p.category,
        tags: p.tags || [],
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        author: 'Anonymous', // For anonymous search
        createdAt: p.created_at,
        userVote: null, // Anonymous users don't have votes
      }));
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Search request was aborted');
        return [];
      }
      console.error('Error searching prompts:', error);
      return [];
    }
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
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', userId)
      .eq('prompt_id', promptId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingVote) {
      // If same vote type, just remove it (toggle off)
      if (existingVote.vote_type === voteType) {
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('user_id', userId)
          .eq('prompt_id', promptId);

        if (deleteError) throw deleteError;

        // Decrement prompt count
        const { data: prompt } = await supabase
          .from('prompts')
          .select('upvotes, downvotes')
          .eq('id', promptId)
          .single();

        if (prompt) {
          const { error: updateError } = await supabase
            .from('prompts')
            .update({
              upvotes: existingVote.vote_type === 'up' ? Math.max(0, prompt.upvotes - 1) : prompt.upvotes,
              downvotes: existingVote.vote_type === 'down' ? Math.max(0, prompt.downvotes - 1) : prompt.downvotes,
            })
            .eq('id', promptId);
          if (updateError) throw updateError;
        }
        return;
      }

      // Different vote type - update the existing vote instead of delete+insert
      // This avoids the 409 conflict
      const { error: updateVoteError } = await supabase
        .from('votes')
        .update({ vote_type: voteType })
        .eq('user_id', userId)
        .eq('prompt_id', promptId);

      if (updateVoteError) throw updateVoteError;

      // Update prompt counts - remove old vote, add new vote
      const { data: prompt } = await supabase
        .from('prompts')
        .select('upvotes, downvotes')
        .eq('id', promptId)
        .single();

      if (prompt) {
        const { error: updatePromptError } = await supabase
          .from('prompts')
          .update({
            upvotes: voteType === 'up' ? prompt.upvotes + 1 : Math.max(0, prompt.upvotes - 1),
            downvotes: voteType === 'down' ? prompt.downvotes + 1 : Math.max(0, prompt.downvotes - 1),
          })
          .eq('id', promptId);
        if (updatePromptError) throw updatePromptError;
      }
      return;
    }

    // No existing vote - insert new one
    const { error: insertError } = await supabase.from('votes').insert({
      user_id: userId,
      prompt_id: promptId,
      vote_type: voteType,
    });

    if (insertError) throw insertError;

    // Update prompt counts
    const { data: prompt } = await supabase
      .from('prompts')
      .select('upvotes, downvotes')
      .eq('id', promptId)
      .single();

    if (prompt) {
      const { error: updatePromptError } = await supabase
        .from('prompts')
        .update({
          upvotes: voteType === 'up' ? prompt.upvotes + 1 : prompt.upvotes,
          downvotes: voteType === 'down' ? prompt.downvotes + 1 : prompt.downvotes,
        })
        .eq('id', promptId);
      if (updatePromptError) throw updatePromptError;
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

    try {
      // Add timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const { data, error } = await supabaseAnonymous
        .from('prompts')
        .select('category')
        .eq('published', true)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        // Handle RLS or permission errors
        if (error.code === '42501' || error.code === 'PGRST116') {
          console.warn('Access denied to prompts table - check RLS policies');
          // Return mock categories on RLS error
          return [
            { id: 'all', name: 'All', icon: 'Grid3x3', count: 0 },
            { id: 'coding', name: 'Coding', icon: 'Code2', count: 0 },
            { id: 'writing', name: 'Writing', icon: 'FileText', count: 0 },
            { id: 'marketing', name: 'Marketing', icon: 'Megaphone', count: 0 },
            { id: 'productivity', name: 'Productivity', icon: 'Zap', count: 0 },
            { id: 'design', name: 'Design', icon: 'Palette', count: 0 },
          ];
        }
        if (error.status === 401) {
          console.warn('Unauthorized access to prompts - session may be expired');
          // Return mock categories on 401
          return [
            { id: 'all', name: 'All', icon: 'Grid3x3', count: 0 },
            { id: 'coding', name: 'Coding', icon: 'Code2', count: 0 },
            { id: 'writing', name: 'Writing', icon: 'FileText', count: 0 },
            { id: 'marketing', name: 'Marketing', icon: 'Megaphone', count: 0 },
            { id: 'productivity', name: 'Productivity', icon: 'Zap', count: 0 },
            { id: 'design', name: 'Design', icon: 'Palette', count: 0 },
          ];
        }
        throw error;
      }

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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Categories request was aborted (likely due to timeout)');
        // Return mock categories on abort
        return [
          { id: 'all', name: 'All', icon: 'Grid3x3', count: 0 },
          { id: 'coding', name: 'Coding', icon: 'Code2', count: 0 },
          { id: 'writing', name: 'Writing', icon: 'FileText', count: 0 },
          { id: 'marketing', name: 'Marketing', icon: 'Megaphone', count: 0 },
          { id: 'productivity', name: 'Productivity', icon: 'Zap', count: 0 },
          { id: 'design', name: 'Design', icon: 'Palette', count: 0 },
        ];
      }
      console.error('Error fetching categories:', error);
      // Return mock categories on any error
      return [
        { id: 'all', name: 'All', icon: 'Grid3x3', count: 0 },
        { id: 'coding', name: 'Coding', icon: 'Code2', count: 0 },
        { id: 'writing', name: 'Writing', icon: 'FileText', count: 0 },
        { id: 'marketing', name: 'Marketing', icon: 'Megaphone', count: 0 },
        { id: 'productivity', name: 'Productivity', icon: 'Zap', count: 0 },
        { id: 'design', name: 'Design', icon: 'Palette', count: 0 },
      ];
    }
  },
};
