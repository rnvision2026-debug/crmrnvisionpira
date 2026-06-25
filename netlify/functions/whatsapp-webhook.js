import { json, request } from './_helpers.js'

function text(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: String(body || '') }
}
function cleanPhone(phone = '') { return String(phone || '').replace(/\D/g, '') }
function extractMessage(message) {
  if (message?.type === 'text') return message.text?.body || ''
  if (message?.type === 'image') return '[Imagem recebida]'
  if (message?.type === 'audio') return '[Áudio recebido]'
  if (message?.type === 'video') return '[Vídeo recebido]'
  if (message?.type === 'document') return `[Documento recebido] ${message.document?.filename || ''}`.trim()
  if (message?.type === 'button') return message.button?.text || '[Botão recebido]'
  if (message?.type === 'interactive') return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '[Interativo recebido]'
  return `[Mensagem ${message?.type || 'recebida'}]`
}
async function upsertConversation({ phone, name, message, at }) {
  const rows = await request(`/rest/v1/whatsapp_conversations?contact_phone=eq.${encodeURIComponent(phone)}&select=*`, { admin: true })
  const existing = Array.isArray(rows) ? rows[0] : rows
  if (existing) {
    const updated = await request(`/rest/v1/whatsapp_conversations?id=eq.${encodeURIComponent(existing.id)}`, {
      method: 'PATCH', admin: true, prefer: 'return=representation', body: {
        contact_name: existing.contact_name || name || null,
        last_message: message,
        last_message_at: at,
        last_inbound_at: at,
        unread_count: Number(existing.unread_count || 0) + 1,
        status: existing.status || 'novo'
      }
    })
    return Array.isArray(updated) ? updated[0] : updated
  }
  const inserted = await request('/rest/v1/whatsapp_conversations', {
    method: 'POST', admin: true, prefer: 'return=representation', body: {
      contact_phone: phone,
      contact_name: name || null,
      status: 'novo',
      last_message: message,
      last_message_at: at,
      last_inbound_at: at,
      unread_count: 1,
      created_at: at
    }
  })
  return Array.isArray(inserted) ? inserted[0] : inserted
}

export async function handler(event) {
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {}
    const mode = params['hub.mode']
    const token = params['hub.verify_token']
    const challenge = params['hub.challenge']
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) return text(200, challenge)
    return text(403, 'Token de verificação inválido.')
  }
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' })

  try {
    const body = JSON.parse(event.body || '{}')
    const entries = body.entry || []
    for (const entry of entries) {
      for (const change of (entry.changes || [])) {
        const value = change.value || {}
        const contacts = value.contacts || []
        const contactByWaId = new Map(contacts.map(c => [cleanPhone(c.wa_id), c]))
        for (const msg of (value.messages || [])) {
          const phone = cleanPhone(msg.from)
          if (!phone) continue
          const contact = contactByWaId.get(phone)
          const name = contact?.profile?.name || null
          const message = extractMessage(msg)
          const at = msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString()
          const conversation = await upsertConversation({ phone, name, message, at })
          await request('/rest/v1/whatsapp_messages', {
            method: 'POST', admin: true, prefer: 'return=minimal', body: {
              conversation_id: conversation.id,
              direction: 'inbound',
              sender_name: name || 'Cliente',
              contact_phone: phone,
              message,
              meta_message_id: msg.id || null,
              meta_status: 'received',
              raw: msg,
              created_at: at
            }
          }).catch(() => null)
        }
      }
    }
    return json(200, { ok: true })
  } catch (error) {
    // A Meta espera 200 para não ficar reenviando eventos quando possível.
    return json(200, { ok: false, error: error.message || 'Erro ao processar webhook.' })
  }
}
