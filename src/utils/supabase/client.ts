import { createBrowserClient } from '@supabase/ssr'
import { dbOptions } from '@/lib/dbSchema'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    dbOptions
  )
}
