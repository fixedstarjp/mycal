import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// .env.local に VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY があればSupabaseモード、
// なければlocalStorageモードで動作する(docs/SETUP_SUPABASE.md 参照)
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseMode = supabase !== null
