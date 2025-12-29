{/*

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Log for verification (safe because anon key is public)
console.log('🔧 Supabase URL:', supabaseUrl);
console.log('✅ Supabase client initialized');

// Create Supabase client with realtime configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We're using your JWT auth, not Supabase auth
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Allow up to 10 events per second
    },
  },
  db: {
    schema: 'chat', // Default to chat schema
  },
});

// Test realtime connection
supabase.realtime.connect();

console.log('🔔 Supabase Realtime connection established');

// Export for testing
export { supabaseUrl, supabaseAnonKey };

*/}