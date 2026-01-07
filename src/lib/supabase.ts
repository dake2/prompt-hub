import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase config check:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length,
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Using mock mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'x-client-info': 'prompt-market/1.0.0',
      },
    },
    // Add request timeout to prevent hanging requests
    db: {
      schema: 'public',
    },
  }
);

// Debug auth state
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'Has session' : 'No session');
  if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  } else if (event === 'USER_UPDATED') {
    console.log('User updated');
  }
});

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

// Create a separate client for anonymous operations (no auth headers)
export const supabaseAnonymous = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    global: {
      headers: {
        'x-client-info': 'prompt-market/1.0.0',
      },
    },
    db: {
      schema: 'public',
    },
    // Disable auth for this client
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
