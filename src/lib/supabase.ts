import { createClient } from "@supabase/supabase-js";

// Server-side only - these should NOT be exposed to the client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase credentials. Please create a .env.local file with:\n" +
    "SUPABASE_URL=your_supabase_url\n" +
    "SUPABASE_ANON_KEY=your_supabase_anon_key\n\n" +
    "Note: These are server-side only variables and will not be exposed to the client.\n" +
    "See .env.local.example for reference."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

