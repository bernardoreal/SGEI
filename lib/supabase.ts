import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing!');
}

export const supabase = createBrowserClient(supabaseUrl!, supabaseAnonKey!);

export const handleSupabaseSessionError = async (error: any) => {
  if (error && (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token'))) {
    await supabase.auth.signOut();
    window.location.href = '/';
    return true;
  }
  return false;
};

