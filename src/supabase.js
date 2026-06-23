import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null

export function getConfigMessage() {
  if (!supabaseUrl) return 'VITE_SUPABASE_URL não configurada.'
  if (!supabaseKey) return 'VITE_SUPABASE_ANON_KEY não configurada.'
  return ''
}
