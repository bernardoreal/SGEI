import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

// Initialize the client only if keys are present to avoid crashing the app
export const supabase = isSupabaseConfigured()
  ? createBrowserClient(supabaseUrl!, supabaseAnonKey!)
  : (null as any); // Type cast to avoid breaking existing imports, but we should handle null checks where used

export const handleSupabaseSessionError = async (error: any) => {
  if (!supabase) return false;
  
  if (error && (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token'))) {
    await supabase.auth.signOut();
    window.location.href = '/';
    return true;
  }
  return false;
};

