import { json, requireAdmin } from './_helpers.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' })

  try {
    const { admin } = await requireAdmin(event)
    const body = JSON.parse(event.body || '{}')

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '').trim()
    const phone = String(body.phone || '').trim()
    const commissionRate = Number(body.commission_rate || 0.15)

    if (!name) return json(400, { error: 'Informe o nome do vendedor.' })
    if (!email || !email.includes('@')) return json(400, { error: 'Informe um e-mail válido.' })
    if (!password || password.length < 6) return json(400, { error: 'A senha precisa ter pelo menos 6 caracteres.' })

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'vendedor' }
    })

    if (createError) {
      const message = createError.message?.includes('already') || createError.message?.includes('registered')
        ? 'Esse e-mail já existe no Supabase Auth. Use outro e-mail ou edite o vendedor existente.'
        : createError.message
      return json(400, { error: message })
    }

    const userId = created.user.id
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        name,
        email,
        phone,
        role: 'vendedor',
        active: true,
        commission_rate: commissionRate
      }, { onConflict: 'id' })
      .select()
      .single()

    if (profileError) return json(400, { error: profileError.message })

    return json(200, { ok: true, profile })
  } catch (error) {
    return json(500, { error: error.message || 'Erro inesperado ao criar vendedor.' })
  }
}
