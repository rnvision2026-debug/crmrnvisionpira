const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

export function json(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) }
}

function readEnv() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL não está configurada no Netlify.')
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não está configurada no Netlify.')

  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), anonKey, serviceKey }
}

function extractError(data, fallback) {
  if (!data) return fallback
  if (typeof data === 'string') return data
  return data.message || data.msg || data.error_description || data.error || fallback
}

async function request(path, { method = 'GET', body, token, prefer, admin = true } = {}) {
  const { supabaseUrl, anonKey, serviceKey } = readEnv()
  const apiKey = admin ? serviceKey : (anonKey || serviceKey)
  const authorization = token ? `Bearer ${token}` : `Bearer ${serviceKey}`

  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: authorization,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })

  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!response.ok) {
    throw new Error(extractError(data, `Erro ${response.status} ao conversar com o Supabase.`))
  }

  return data
}

export async function verifySession(token) {
  if (!token) throw new Error('Sessão não enviada. Faça login novamente.')
  return request('/auth/v1/user', { token, admin: false })
}

export async function requireAdmin(event) {
  const token = (event.headers.authorization || event.headers.Authorization || '').replace('Bearer ', '').trim()
  const user = await verifySession(token)
  const userId = user?.id || user?.user?.id
  if (!userId) throw new Error('Sessão inválida. Faça login novamente.')

  const profiles = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role,active,email`, { admin: true })
  const profile = Array.isArray(profiles) ? profiles[0] : profiles

  if (!profile) throw new Error('Perfil do administrador não encontrado. Rode o admin_setup.sql no Supabase.')
  if (profile.role !== 'admin' || !profile.active) throw new Error('Você não tem permissão de administrador.')

  return { profile, user, userId }
}

export async function createAuthUser({ email, password, name, role }) {
  return request('/auth/v1/admin/users', {
    method: 'POST',
    admin: true,
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    }
  })
}

export async function updateAuthUserPassword(userId, password) {
  return request(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    admin: true,
    body: { password }
  })
}

export async function upsertProfile(profile) {
  const data = await request('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    admin: true,
    prefer: 'resolution=merge-duplicates,return=representation',
    body: profile
  })
  return Array.isArray(data) ? data[0] : data
}
