import { createClient } from '@supabase/supabase-js'

export function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  }
}

export function getAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configuradas no Netlify.')
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function requireAdmin(event) {
  const token = (event.headers.authorization || event.headers.Authorization || '').replace('Bearer ', '').trim()
  if (!token) throw new Error('Sessão não enviada. Faça login novamente.')

  const admin = getAdminClient()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData?.user?.id) throw new Error('Sessão inválida. Faça login novamente.')

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, active, email')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile) throw new Error('Perfil do admin não encontrado.')
  if (profile.role !== 'admin' || !profile.active) throw new Error('Você não tem permissão de administrador.')

  return { admin, profile, user: userData.user }
}
