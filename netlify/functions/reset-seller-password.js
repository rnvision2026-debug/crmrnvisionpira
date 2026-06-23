import { json, requireAdmin } from './_helpers.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' })

  try {
    const { admin } = await requireAdmin(event)
    const body = JSON.parse(event.body || '{}')
    const userId = String(body.user_id || '').trim()
    const password = String(body.password || '').trim()

    if (!userId) return json(400, { error: 'Usuário não informado.' })
    if (!password || password.length < 6) return json(400, { error: 'A senha precisa ter pelo menos 6 caracteres.' })

    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) return json(400, { error: error.message })

    return json(200, { ok: true })
  } catch (error) {
    return json(500, { error: error.message || 'Erro inesperado ao trocar senha.' })
  }
}
