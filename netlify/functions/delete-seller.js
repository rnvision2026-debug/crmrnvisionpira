import { json, requireAdmin, getProfileById, reassignSellerLeads, deleteProfile, deleteAuthUser } from './_helpers.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' })

  try {
    const { userId: adminId } = await requireAdmin(event)
    const body = JSON.parse(event.body || '{}')
    const sellerId = String(body.user_id || '').trim()

    if (!sellerId) return json(400, { error: 'Informe o vendedor que será excluído.' })
    if (sellerId === adminId) return json(400, { error: 'Você não pode excluir seu próprio usuário administrador.' })

    const seller = await getProfileById(sellerId)
    if (!seller) return json(404, { error: 'Vendedor não encontrado.' })
    if (seller.role !== 'vendedor') return json(400, { error: 'Apenas vendedores podem ser excluídos por aqui.' })

    // Mantém os leads salvos: antes de apagar o vendedor, passa os leads dele para o admin logado.
    const reassigned = await reassignSellerLeads(sellerId, adminId)

    // Remove o login real no Supabase Auth. O perfil é apagado em cascata;
    // o deleteProfile abaixo é uma garantia para bancos antigos.
    await deleteAuthUser(sellerId)
    await deleteProfile(sellerId)

    return json(200, { ok: true, reassigned_leads: Array.isArray(reassigned) ? reassigned.length : 0 })
  } catch (error) {
    return json(400, { error: error.message || 'Erro inesperado ao excluir vendedor.' })
  }
}
