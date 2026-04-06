import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key && url !== 'your_url' && key !== 'your_key') {
        supabase = createClient(url, key);
    }
} catch (error) {
    console.warn("Supabase client not initialized:", error);
}

export { supabase };
