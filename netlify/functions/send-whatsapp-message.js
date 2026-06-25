import { json, requireAdmin, request } from './_helpers.js'

function cleanPhone(phone = '') {
  return String(phone || '').replace(/\D/g, '')
}

function readWhatsAppEnv() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v20.0'
  if (!accessToken) throw new Error('WHATSAPP_ACCESS_TOKEN não está configurado no Netlify.')
  if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID não está configurado no Netlify.')
  return { accessToken, phoneNumberId, graphVersion }
}

async function getConversation(id) {
  const data = await request(`/rest/v1/whatsapp_conversations?id=eq.${encodeURIComponent(id)}&select=*`, { admin: true })
  return Array.isArray(data) ? data[0] : data
}

async function sendCloudMessage(to, text) {
  const { accessToken, phoneNumberId, graphVersion } = readWhatsAppEnv()
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text }
    })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const details = data?.error?.message || data?.error?.error_data?.details || `Erro ${response.status} na Meta WhatsApp API.`
    throw new Error(details)
  }
  return data
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' })

  try {
    const { profile } = await requireAdmin(event).catch(async (err) => {
      // requireAdmin valida admin. Para vendedor, validamos pelo perfil via JWT abaixo usando o mesmo endpoint protegido por RLS.
      const token = (event.headers.authorization || event.headers.Authorization || '').replace('Bearer ', '').trim()
      if (!token) throw err
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
      const rows = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(payload.sub)}&select=*`, { token, admin: false })
      const sellerProfile = Array.isArray(rows) ? rows[0] : rows
      if (!sellerProfile || !sellerProfile.active) throw new Error('Sessão inválida ou usuário bloqueado.')
      return { profile: sellerProfile }
    })

    const body = JSON.parse(event.body || '{}')
    const conversationId = String(body.conversation_id || '').trim()
    const rawMessage = String(body.message || '').trim()
    if (!conversationId) return json(400, { error: 'Atendimento não informado.' })
    if (!rawMessage) return json(400, { error: 'Digite a mensagem.' })

    const conversation = await getConversation(conversationId)
    if (!conversation) return json(404, { error: 'Atendimento não encontrado.' })
    if (profile.role !== 'admin' && conversation.seller_id !== profile.id) return json(403, { error: 'Esse atendimento não está atribuído a você.' })

    if (conversation.last_inbound_at) {
      const lastInbound = new Date(conversation.last_inbound_at).getTime()
      const elapsedHours = (Date.now() - lastInbound) / 36e5
      if (elapsedHours > 24) {
        return json(400, { error: 'A janela de 24 horas do WhatsApp encerrou. Para enviar fora da janela, será preciso configurar mensagens modelo/templates aprovados.' })
      }
    }

    const to = cleanPhone(conversation.contact_phone)
    if (!to) return json(400, { error: 'Telefone do cliente inválido.' })

    const signedMessage = `${profile.name || 'Atendimento'} | RN Vision Pira:\n${rawMessage}`
    const meta = await sendCloudMessage(to, signedMessage)
    const metaMessageId = meta?.messages?.[0]?.id || null
    const now = new Date().toISOString()

    const inserted = await request('/rest/v1/whatsapp_messages', {
      method: 'POST',
      admin: true,
      prefer: 'return=representation',
      body: {
        conversation_id: conversation.id,
        direction: 'outbound',
        sender_profile_id: profile.id,
        sender_name: profile.name,
        contact_phone: to,
        message: signedMessage,
        meta_message_id: metaMessageId,
        meta_status: 'sent',
        raw: meta,
        created_at: now
      }
    })

    await request(`/rest/v1/whatsapp_conversations?id=eq.${encodeURIComponent(conversation.id)}`, {
      method: 'PATCH',
      admin: true,
      body: {
        last_message: signedMessage,
        last_message_at: now,
        unread_count: 0,
        status: conversation.status === 'novo' ? 'em_atendimento' : conversation.status
      }
    })

    return json(200, { ok: true, message: Array.isArray(inserted) ? inserted[0] : inserted, meta })
  } catch (error) {
    return json(400, { error: error.message || 'Erro ao enviar mensagem.' })
  }
}
