import { json, requireAdmin, createAuthUser, upsertProfile } from './_helpers.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' })

  try {
    await requireAdmin(event)
    const body = JSON.parse(event.body || '{}')

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '').trim()
    const phone = String(body.phone || '').trim()
    const commissionRate = Number(body.commission_rate || 0.15)

    if (!name) return json(400, { error: 'Informe o nome do vendedor.' })
    if (!email || !email.includes('@')) return json(400, { error: 'Informe um e-mail válido.' })
    if (!password || password.length < 6) return json(400, { error: 'A senha precisa ter pelo menos 6 caracteres.' })

    const created = await createAuthUser({ email, password, name, role: 'vendedor' })
    const userId = created?.user?.id || created?.id
    if (!userId) return json(500, { error: 'Usuário criado, mas o Supabase não retornou o ID. Verifique o Auth.' })

    const profile = await upsertProfile({
      id: userId,
      name,
      email,
      phone,
      role: 'vendedor',
      active: true,
      commission_rate: commissionRate
    })

    return json(200, { ok: true, profile })
  } catch (error) {
    const raw = error.message || 'Erro inesperado ao criar vendedor.'
    const message = raw.toLowerCase().includes('already') || raw.toLowerCase().includes('registered') || raw.toLowerCase().includes('exists')
      ? 'Esse e-mail já existe no Supabase Auth. Use outro e-mail ou troque a senha do vendedor existente.'
      : raw
    return json(400, { error: message })
  }
}
