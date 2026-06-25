import React, { useEffect, useMemo, useState } from 'react'
import { getConfigMessage, isConfigured, supabase } from './supabase.js'

const LOGO = '/logo-rn-vision-pira.png'
const STATUS = [
  ['novo', 'Novo'],
  ['em_atendimento', 'Em atendimento'],
  ['proposta_enviada', 'Proposta enviada'],
  ['negociacao', 'Negociação'],
  ['fechado', 'Fechado'],
  ['perdido', 'Perdido']
]
const statusLabel = (value) => STATUS.find(([id]) => id === value)?.[1] || 'Novo'
const typeLabel = (value) => ({ whatsapp_inicio: 'Atendimento iniciado', observacao: 'Resumo da conversa', objecao: 'Objeção', retorno: 'Retorno', proposta: 'Proposta', fechamento: 'Fechamento', atualizacao: 'Atualização' }[value] || 'Registro')
const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v) => `${Math.round(Number(v || 0) * 100)}%`
const todayISO = () => new Date().toISOString()
const currentMonth = () => new Date().toISOString().slice(0, 7)
const cleanPhone = (phone = '') => phone.replace(/\D/g, '')
const initialValue = (service) => Number(service?.development_price || 0) + Number(service?.setup_integration_price || 0)
const calcBonus = (count) => count >= 15 ? 1000 : count >= 10 ? 500 : 0
const formatDateTime = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'
const deviceLabel = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'Celular' : 'Computador'

const blankLead = {
  client_name: '', company_name: '', whatsapp: '', email: '', origin: 'WhatsApp',
  status: 'novo', proposal_value: '', notes: '', next_contact_at: '', loss_reason: '', service_id: ''
}
const blankService = {
  name: '', category: 'Sites', description: '', development_price: '', setup_integration_price: '', monthly_price: '',
  payment_terms: '50% para iniciar e 50% na entrega, após aprovação.', delivery_time: '7 a 15 dias úteis', sales_arguments: '', active: true, sort_order: 0
}
const blankSeller = { name: '', email: '', password: '', phone: '', commission_rate: 0.15 }
const DEFAULT_WHATSAPP_TEMPLATE = `Olá, tudo bem? Aqui é o {vendedor}, da RN Vision Pira.

Vi que você tem interesse em {servico}. Posso te explicar as opções e valores?`
const renderTemplate = (template, data) => String(template || DEFAULT_WHATSAPP_TEMPLATE)
  .replaceAll('{vendedor}', data.vendedor || '')
  .replaceAll('{cliente}', data.cliente || '')
  .replaceAll('{empresa}', data.empresa || '')
  .replaceAll('{servico}', data.servico || '')
  .replaceAll('{valor}', data.valor || '')

function Toast({ message, type, onClose }) {
  if (!message) return null
  return <div className={`toast ${type || ''}`} onClick={onClose}>{message}</div>
}

function Welcome({ profile }) {
  return <div className="welcome"><div className="welcome-card"><img src={LOGO} alt="RN Vision Pira" /><div className="loader" /><h1>Bem-vindo ao RN CRM Vendas</h1><p>{profile?.name ? `${profile.name}, estamos preparando seu painel.` : 'Carregando o sistema.'}</p></div></div>
}

function Login({ onLogin, loading, error }) {
  const [email, setEmail] = useState('admin@rnvision.com.br')
  const [password, setPassword] = useState('123456')
  return <div className="login-page">
    <section className="login-brand">
      <img src={LOGO} alt="RN Vision Pira" />
      <h1>CRM interno para vendedores</h1>
      <p>Organize leads, propostas, serviços, comissões e metas em uma plataforma profissional da RN Vision Pira.</p>
      <div className="pills"><span>Leads</span><span>Propostas</span><span>Comissões</span><span>Serviços</span></div>
    </section>
    <form className="login-card" onSubmit={(e) => { e.preventDefault(); onLogin(email, password) }}>
      <span className="eyebrow">Acesso seguro</span>
      <h2>Entrar no sistema</h2>
      <p>Login com Supabase Auth.</p>
      {!isConfigured && <div className="alert">{getConfigMessage()}</div>}
      {error && <div className="alert danger">{error}</div>}
      <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      <button className="primary" disabled={loading}>{loading ? 'Entrando...' : 'Acessar CRM'}</button>
    </form>
  </div>
}

function Sidebar({ page, setPage, profile, onLogout, open, onClose }) {
  const items = [
    ['dashboard', 'Dashboard', '📊'], ['leads', 'Leads', '👥'], ['negociacoes', 'Negociações', '📝'], ['servicos', 'Serviços e valores', '💼'], ['comissoes', 'Comissões', '💰'],
    ...(profile.role === 'admin' ? [['vendedores', 'Vendedores', '🧑‍💼'], ['login_logs', 'Registros de login', '🕘']] : []), ['config', 'Configurações', '⚙️']
  ]
  function navigate(id) {
    setPage(id)
    onClose?.()
  }
  return <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Menu principal">
    <div className="sidebar-head">
      <img src={LOGO} className="side-logo" alt="RN Vision Pira" />
      <button type="button" className="menu-close" onClick={onClose} aria-label="Fechar menu">×</button>
    </div>
    <nav>{items.map(([id, label, icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><span>{icon}</span>{label}</button>)}</nav>
    <div className="profile-box"><div className="avatar">{profile.name?.[0] || 'R'}</div><div><b>{profile.name}</b><small>{profile.role === 'admin' ? 'Administrador' : 'Vendedor'}</small></div></div>
    <button className="logout" onClick={onLogout}>Sair</button>
  </aside>
}

function Layout({ page, setPage, profile, onLogout, onInstallApp, title, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    return () => document.body.classList.remove('menu-open')
  }, [menuOpen])
  return <div className="app">
    <button type="button" className={`menu-backdrop ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
    <Sidebar page={page} setPage={setPage} profile={profile} onLogout={onLogout} open={menuOpen} onClose={() => setMenuOpen(false)} />
    <main>
      <header className="topbar"><div className="top-title"><button type="button" className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">☰</button><div><h2>{title}</h2><p>{profile.role === 'admin' ? 'Controle completo da equipe comercial.' : 'Acompanhe seus leads, retornos e comissões.'}</p></div></div><div className="top-actions"><span className="online">Supabase conectado</span><button className="ghost install-top" type="button" onClick={onInstallApp}>Instalar app</button><button className="logout-top" type="button" onClick={onLogout}>Sair</button></div></header>
      {children}
    </main>
  </div>
}

function Stat({ label, value, hint }) {
  return <article className="stat"><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>
}

function Dashboard({ leads, profiles, profile }) {
  const visible = leads
  const monthClosed = visible.filter(l => l.status === 'fechado' && (l.closed_at || l.updated_at || '').slice(0, 7) === currentMonth())
  const open = visible.filter(l => !['fechado', 'perdido'].includes(l.status)).length
  const totalProposals = visible.reduce((s, l) => s + Number(l.proposal_value || 0), 0)
  const sold = monthClosed.reduce((s, l) => s + Number(l.proposal_value || 0), 0)
  return <div className="grid gap">
    <div className="stats"><Stat label="Leads cadastrados" value={visible.length} hint="Total visível" /><Stat label="Em andamento" value={open} hint="Abertos" /><Stat label="Propostas" value={money(totalProposals)} hint="Valor em negociação" /><Stat label="Vendas do mês" value={money(sold)} hint="Status fechado" /></div>
    <div className="two-cols">
      <section className="card"><h3>Últimos leads</h3><div className="list">{visible.slice(0, 6).map(l => <div key={l.id} className="list-row"><div><b>{l.client_name}</b><small>{l.company_name || 'Sem empresa'} • {statusLabel(l.status)}</small></div><strong>{money(l.proposal_value)}</strong></div>)}{!visible.length && <p className="empty">Nenhum lead cadastrado ainda.</p>}</div></section>
      <section className="card"><h3>Equipe</h3><div className="list">{profiles.filter(p => p.role === 'vendedor').map(p => <div key={p.id} className="list-row"><div><b>{p.name}</b><small>{p.email}</small></div><span className={p.active ? 'badge ok' : 'badge off'}>{p.active ? 'Ativo' : 'Bloqueado'}</span></div>)}{profile.role !== 'admin' && <p className="empty">Área de equipe visível apenas para admin.</p>}</div></section>
    </div>
  </div>
}

function LeadForm({ profile, profiles, services, editing, onCancel, onSave }) {
  const [form, setForm] = useState(() => editing ? {
    ...blankLead,
    ...editing,
    next_contact_at: editing.next_contact_at || '',
    service_id: editing.service_id || '',
    proposal_value: editing.proposal_value || ''
  } : blankLead)
  function update(key, value) {
    const next = { ...form, [key]: value }
    if (key === 'service_id') {
      const service = services.find(s => s.id === value)
      next.proposal_value = service ? initialValue(service) : ''
    }
    setForm(next)
  }
  return <form className="card form" onSubmit={(e) => { e.preventDefault(); onSave(form) }}>
    <div className="form-head"><h3>{editing ? 'Editar lead' : 'Novo lead'}</h3><button type="button" className="ghost" onClick={onCancel}>Fechar</button></div>
    <div className="form-grid">
      <label>Nome do cliente<input value={form.client_name} onChange={e => update('client_name', e.target.value)} required /></label>
      <label>Empresa<input value={form.company_name || ''} onChange={e => update('company_name', e.target.value)} /></label>
      <label>WhatsApp<input value={form.whatsapp || ''} onChange={e => update('whatsapp', e.target.value)} placeholder="(19) 99999-9999" /></label>
      <label>E-mail<input type="email" value={form.email || ''} onChange={e => update('email', e.target.value)} /></label>
      <label>Serviço<select value={form.service_id || ''} onChange={e => update('service_id', e.target.value)}><option value="">Selecionar</option>{services.map(s => <option key={s.id} value={s.id}>{s.name} — {money(initialValue(s))}</option>)}</select></label>
      <label>Valor da proposta<input type="number" step="0.01" value={form.proposal_value} onChange={e => update('proposal_value', e.target.value)} /></label>
      <label>Status<select value={form.status} onChange={e => update('status', e.target.value)}>{STATUS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Próximo retorno<input type="date" value={form.next_contact_at || ''} onChange={e => update('next_contact_at', e.target.value)} /></label>
      {profile.role === 'admin' && <label>Vendedor<select value={form.vendedor_id || profile.id} onChange={e => update('vendedor_id', e.target.value)}>{profiles.filter(p => p.role === 'vendedor' || p.role === 'admin').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <label className="full">Observações<textarea value={form.notes || ''} onChange={e => update('notes', e.target.value)} rows="4" /></label>
    </div>
    <button className="primary">Salvar lead</button>
  </form>
}

function LeadsPage({ profile, profiles, services, leads, reload, notify }) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const filtered = leads.filter(l => {
    const text = `${l.client_name} ${l.company_name} ${l.whatsapp}`.toLowerCase()
    return text.includes(search.toLowerCase()) && (status === 'todos' || l.status === status)
  })
  async function saveLead(form) {
    const payload = {
      vendedor_id: form.vendedor_id || profile.id,
      service_id: form.service_id || null,
      client_name: form.client_name,
      company_name: form.company_name || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      origin: form.origin || 'WhatsApp',
      status: form.status,
      proposal_value: Number(form.proposal_value || 0),
      notes: form.notes || null,
      next_contact_at: form.next_contact_at || null,
      closed_at: form.status === 'fechado' ? (form.closed_at || todayISO()) : null,
      loss_reason: form.loss_reason || null
    }
    const query = editing ? supabase.from('leads').update(payload).eq('id', editing.id) : supabase.from('leads').insert(payload)
    const { error } = await query
    if (error) return notify(error.message, 'danger')
    setShow(false); setEditing(null); notify('Lead salvo com sucesso.', 'ok'); reload()
  }
  async function removeLead(id) {
    if (profile.role !== 'admin') return notify('Apenas o admin pode excluir leads.', 'danger')
    if (!confirm('Excluir este lead?')) return
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) return notify(error.message, 'danger')
    notify('Lead excluído.', 'ok'); reload()
  }
  async function updateLeadStatus(lead, nextStatus) {
    const payload = {
      status: nextStatus,
      closed_at: nextStatus === 'fechado' ? (lead.closed_at || todayISO()) : null
    }
    const { error } = await supabase.from('leads').update(payload).eq('id', lead.id)
    if (error) return notify(error.message, 'danger')
    notify('Status atualizado.', 'ok')
    reload()
  }
  function copyLead(l) {
    const service = services.find(s => s.id === l.service_id)
    const msg = `Olá, ${l.client_name}. Tudo bem?\n\nConforme conversamos, segue a proposta para ${service?.name || 'o serviço solicitado'}.\nInvestimento inicial: ${money(l.proposal_value)}.\n\nFico à disposição para avançarmos.`
    navigator.clipboard?.writeText(msg); notify('Mensagem copiada.', 'ok')
  }
  return <div className="grid gap">
    <section className="toolbar"><input placeholder="Buscar lead..." value={search} onChange={e => setSearch(e.target.value)} /><select value={status} onChange={e => setStatus(e.target.value)}><option value="todos">Todos os status</option>{STATUS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><button className="primary" onClick={() => { setEditing(null); setShow(true) }}>+ Novo lead</button></section>
    {show && <LeadForm profile={profile} profiles={profiles} services={services} editing={editing} onCancel={() => { setShow(false); setEditing(null) }} onSave={saveLead} />}
    <section className="card leads-card"><div className="table-wrap desktop-table"><table><thead><tr><th>Cliente</th><th>Serviço</th><th>Status</th><th>Valor</th><th>Retorno</th><th>Vendedor</th><th>Ações</th></tr></thead><tbody>{filtered.map(l => { const seller = profiles.find(p => p.id === l.vendedor_id); const service = services.find(s => s.id === l.service_id); return <tr key={l.id}><td><b>{l.client_name}</b><small>{l.company_name || l.whatsapp || '-'}</small></td><td>{service?.name || '-'}</td><td><select className={`status-select ${l.status}`} value={l.status} onChange={(e) => updateLeadStatus(l, e.target.value)}>{STATUS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></td><td><b>{money(l.proposal_value)}</b></td><td>{l.next_contact_at || '-'}</td><td>{seller?.name || '-'}</td><td className="actions"><button onClick={() => copyLead(l)}>Copiar</button>{l.whatsapp && <a target="_blank" rel="noreferrer" href={`https://wa.me/55${cleanPhone(l.whatsapp)}`}>WhatsApp</a>}<button onClick={() => { setEditing(l); setShow(true) }}>Editar</button>{profile.role === 'admin' && <button className="danger" onClick={() => removeLead(l.id)}>Excluir lead</button>}</td></tr> })}</tbody></table>{!filtered.length && <p className="empty">Nenhum lead encontrado.</p>}</div>
      <div className="mobile-list">{filtered.map(l => { const seller = profiles.find(p => p.id === l.vendedor_id); const service = services.find(s => s.id === l.service_id); return <article key={l.id} className="mobile-lead"><div className="mobile-lead-head"><div><b>{l.client_name}</b><small>{l.company_name || l.whatsapp || 'Sem empresa'}</small></div><strong>{money(l.proposal_value)}</strong></div><div className="mobile-meta"><span>{service?.name || 'Sem serviço'}</span><span>Retorno: {l.next_contact_at || '-'}</span><span>Vendedor: {seller?.name || '-'}</span></div><select className={`status-select ${l.status}`} value={l.status} onChange={(e) => updateLeadStatus(l, e.target.value)}>{STATUS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><div className="actions"><button onClick={() => copyLead(l)}>Copiar</button>{l.whatsapp && <a target="_blank" rel="noreferrer" href={`https://wa.me/55${cleanPhone(l.whatsapp)}`}>WhatsApp</a>}<button onClick={() => { setEditing(l); setShow(true) }}>Editar</button>{profile.role === 'admin' && <button className="danger" onClick={() => removeLead(l.id)}>Excluir</button>}</div></article> })}{!filtered.length && <p className="empty">Nenhum lead encontrado.</p>}</div>
    </section>
  </div>
}

function ServicesPage({ profile, services, reload, notify }) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(blankService)
  function open(service) { setEditing(service || null); setForm(service ? { ...blankService, ...service } : blankService); setShow(true) }
  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })) }
  async function save(e) {
    e.preventDefault()
    const payload = {
      ...form,
      development_price: Number(form.development_price || 0),
      setup_integration_price: Number(form.setup_integration_price || 0),
      monthly_price: Number(form.monthly_price || 0),
      sort_order: Number(form.sort_order || 0)
    }
    const query = editing ? supabase.from('services').update(payload).eq('id', editing.id) : supabase.from('services').insert(payload)
    const { error } = await query
    if (error) return notify(error.message, 'danger')
    setShow(false); notify('Serviço salvo.', 'ok'); reload()
  }
  async function remove(id) {
    if (!confirm('Excluir serviço?')) return
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) return notify(error.message, 'danger')
    notify('Serviço excluído.', 'ok'); reload()
  }
  function copy(s) {
    const text = `${s.name}\nDesenvolvimento: ${money(s.development_price)}\nAdesão + integração: ${money(s.setup_integration_price)}\nMensalidade: ${money(s.monthly_price)}\nPrazo: ${s.delivery_time || '-'}\n${s.sales_arguments || ''}`
    navigator.clipboard?.writeText(text); notify('Texto do serviço copiado.', 'ok')
  }
  return <div className="grid gap">
    <section className="section-title"><div><h3>Serviços e valores</h3><p>Vendedores acompanham os valores atualizados para vender sem dúvidas.</p></div>{profile.role === 'admin' && <button className="primary" onClick={() => open(null)}>+ Novo serviço</button>}</section>
    {show && profile.role === 'admin' && <form className="card form" onSubmit={save}><div className="form-head"><h3>{editing ? 'Editar serviço' : 'Novo serviço'}</h3><button type="button" className="ghost" onClick={() => setShow(false)}>Fechar</button></div><div className="form-grid"><label>Nome<input value={form.name} onChange={e => set('name', e.target.value)} required /></label><label>Categoria<input value={form.category} onChange={e => set('category', e.target.value)} /></label><label>Valor desenvolvimento<input type="number" step="0.01" value={form.development_price} onChange={e => set('development_price', e.target.value)} /></label><label>Adesão + integração<input type="number" step="0.01" value={form.setup_integration_price} onChange={e => set('setup_integration_price', e.target.value)} /></label><label>Mensalidade<input type="number" step="0.01" value={form.monthly_price} onChange={e => set('monthly_price', e.target.value)} /></label><label>Prazo<input value={form.delivery_time || ''} onChange={e => set('delivery_time', e.target.value)} /></label><label>Ativo<select value={form.active ? 'sim' : 'nao'} onChange={e => set('active', e.target.value === 'sim')}><option value="sim">Sim</option><option value="nao">Não</option></select></label><label>Ordem<input type="number" value={form.sort_order || 0} onChange={e => set('sort_order', e.target.value)} /></label><label className="full">Descrição<textarea rows="3" value={form.description || ''} onChange={e => set('description', e.target.value)} /></label><label className="full">Argumento de venda<textarea rows="4" value={form.sales_arguments || ''} onChange={e => set('sales_arguments', e.target.value)} /></label></div><button className="primary">Salvar serviço</button></form>}
    <div className="service-grid">{services.map(s => <article className="service" key={s.id}><div className="service-top"><span>{s.category}</span><b className={s.active ? 'badge ok' : 'badge off'}>{s.active ? 'Ativo' : 'Inativo'}</b></div><h3>{s.name}</h3><p>{s.description}</p><div className="prices"><div><small>Desenvolvimento</small><b>{money(s.development_price)}</b></div><div><small>Adesão + integração</small><b>{money(s.setup_integration_price)}</b></div><div><small>Mensalidade</small><b>{money(s.monthly_price)}</b></div></div><p className="argument">{s.sales_arguments}</p><div className="actions"><button onClick={() => copy(s)}>Copiar texto</button>{profile.role === 'admin' && <><button onClick={() => open(s)}>Editar</button><button className="danger" onClick={() => remove(s.id)}>Excluir</button></>}</div></article>)}</div>
  </div>
}

function SellersPage({ profiles, reload, notify, session }) {
  const [form, setForm] = useState(blankSeller)
  const [reset, setReset] = useState({ user_id: '', password: '' })
  const sellers = profiles.filter(p => p.role === 'vendedor')
  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })) }
  async function getFreshAccessToken() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    const token = data?.session?.access_token || session?.access_token
    if (!token) throw new Error('Sessão expirada. Saia do sistema e entre novamente.')
    return token
  }
  async function createSeller(e) {
    e.preventDefault()
    try {
      const token = await getFreshAccessToken()
      const res = await fetch('/.netlify/functions/create-seller', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) return notify(data.error || 'Erro ao criar vendedor.', 'danger')
      setForm(blankSeller); notify('Vendedor criado com login próprio.', 'ok'); reload()
    } catch (err) {
      notify(err.message || 'Erro ao criar vendedor.', 'danger')
    }
  }
  async function toggleSeller(seller) {
    const { error } = await supabase.from('profiles').update({ active: !seller.active }).eq('id', seller.id)
    if (error) return notify(error.message, 'danger')
    notify(!seller.active ? 'Vendedor ativado.' : 'Vendedor bloqueado.', 'ok'); reload()
  }
  async function saveProfile(seller, fields) {
    const { error } = await supabase.from('profiles').update(fields).eq('id', seller.id)
    if (error) return notify(error.message, 'danger')
    notify('Vendedor atualizado.', 'ok'); reload()
  }
  async function resetPassword(e) {
    e.preventDefault()
    try {
      const token = await getFreshAccessToken()
      const res = await fetch('/.netlify/functions/reset-seller-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(reset) })
      const data = await res.json()
      if (!res.ok) return notify(data.error || 'Erro ao trocar senha.', 'danger')
      setReset({ user_id: '', password: '' }); notify('Senha alterada.', 'ok')
    } catch (err) {
      notify(err.message || 'Erro ao trocar senha.', 'danger')
    }
  }
  return <div className="grid gap">
    <form className="card form" onSubmit={createSeller}><h3>Cadastrar vendedor direto no CRM</h3><p className="muted">O sistema cria o usuário no Supabase Auth e o perfil de vendedor automaticamente.</p><div className="form-grid"><label>Nome<input value={form.name} onChange={e => set('name', e.target.value)} required /></label><label>E-mail<input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></label><label>Senha inicial<input type="password" value={form.password} onChange={e => set('password', e.target.value)} minLength="6" required /></label><label>WhatsApp<input value={form.phone} onChange={e => set('phone', e.target.value)} /></label><label>Comissão<select value={form.commission_rate} onChange={e => set('commission_rate', Number(e.target.value))}><option value="0.15">15%</option><option value="0.10">10%</option><option value="0.20">20%</option></select></label></div><button className="primary">Criar vendedor com login</button></form>
    <section className="card"><h3>Vendedores cadastrados</h3><div className="table-wrap"><table><thead><tr><th>Vendedor</th><th>E-mail</th><th>Comissão</th><th>Status</th><th>Ações</th></tr></thead><tbody>{sellers.map(s => <tr key={s.id}><td><b>{s.name}</b><small>{s.phone || '-'}</small></td><td>{s.email}</td><td>{pct(s.commission_rate)}</td><td><span className={s.active ? 'badge ok' : 'badge off'}>{s.active ? 'Ativo' : 'Bloqueado'}</span></td><td className="actions"><button onClick={() => toggleSeller(s)}>{s.active ? 'Bloquear' : 'Ativar'}</button><button onClick={() => { const rate = prompt('Comissão em porcentagem. Ex: 15', Math.round(s.commission_rate * 100)); if (rate) saveProfile(s, { commission_rate: Number(rate) / 100 }) }}>Comissão</button><button onClick={() => setReset({ user_id: s.id, password: '' })}>Trocar senha</button></td></tr>)}</tbody></table>{!sellers.length && <p className="empty">Nenhum vendedor cadastrado.</p>}</div></section>
    {reset.user_id && <form className="card form" onSubmit={resetPassword}><div className="form-head"><h3>Trocar senha do vendedor</h3><button type="button" className="ghost" onClick={() => setReset({ user_id: '', password: '' })}>Fechar</button></div><label>Nova senha<input type="password" minLength="6" value={reset.password} onChange={e => setReset(r => ({ ...r, password: e.target.value }))} required /></label><button className="primary">Salvar nova senha</button></form>}
  </div>
}

function CommissionsPage({ leads, profiles }) {
  const sellers = profiles.filter(p => p.role === 'vendedor')
  return <section className="card"><h3>Comissões do mês</h3><div className="table-wrap"><table><thead><tr><th>Vendedor</th><th>Vendas fechadas</th><th>Total vendido</th><th>Comissão</th><th>Bônus</th><th>Total a pagar</th></tr></thead><tbody>{sellers.map(s => { const closed = leads.filter(l => l.vendedor_id === s.id && l.status === 'fechado' && (l.closed_at || l.updated_at || '').slice(0, 7) === currentMonth()); const total = closed.reduce((a, l) => a + Number(l.proposal_value || 0), 0); const commission = total * Number(s.commission_rate || 0.15); const bonus = calcBonus(closed.length); return <tr key={s.id}><td><b>{s.name}</b><small>{s.email}</small></td><td>{closed.length}</td><td>{money(total)}</td><td>{money(commission)}</td><td>{money(bonus)}</td><td><b>{money(commission + bonus)}</b></td></tr> })}</tbody></table></div></section>
}


function LoginLogsPage({ loginLogs, profiles, reload }) {
  const [sellerId, setSellerId] = useState('todos')
  const [period, setPeriod] = useState('30')
  const sellers = profiles.filter(p => p.role === 'vendedor')
  const now = Date.now()
  const filtered = loginLogs
    .filter(log => log.role === 'vendedor' || sellers.some(s => s.id === log.user_id || s.email === log.email))
    .filter(log => sellerId === 'todos' || log.user_id === sellerId)
    .filter(log => {
      if (period === 'todos') return true
      const days = Number(period)
      return new Date(log.created_at).getTime() >= now - days * 24 * 60 * 60 * 1000
    })
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = filtered.filter(log => (log.created_at || '').slice(0, 10) === today).length
  const uniqueSellers = new Set(filtered.map(log => log.user_id || log.email)).size

  return <div className="grid gap">
    <div className="stats login-stats"><Stat label="Logins filtrados" value={filtered.length} hint="Registros encontrados" /><Stat label="Hoje" value={todayCount} hint="Acessos no dia" /><Stat label="Vendedores" value={uniqueSellers} hint="Com login registrado" /><Stat label="Último acesso" value={filtered[0] ? formatDateTime(filtered[0].created_at) : '-'} hint="Registro mais recente" /></div>
    <section className="toolbar">
      <select value={sellerId} onChange={e => setSellerId(e.target.value)}>
        <option value="todos">Todos os vendedores</option>
        {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select value={period} onChange={e => setPeriod(e.target.value)}>
        <option value="7">Últimos 7 dias</option>
        <option value="30">Últimos 30 dias</option>
        <option value="90">Últimos 90 dias</option>
        <option value="todos">Todos os registros</option>
      </select>
      <button className="ghost" type="button" onClick={reload}>Atualizar</button>
    </section>
    <section className="card leads-card">
      <div className="form-head"><div><h3>Registros de login dos vendedores</h3><p className="muted">Acompanhe data, hora, e-mail e dispositivo usado no acesso.</p></div></div>
      <div className="table-wrap desktop-table"><table><thead><tr><th>Vendedor</th><th>E-mail</th><th>Data e hora</th><th>Dispositivo</th><th>Navegador</th></tr></thead><tbody>{filtered.map(log => <tr key={log.id}><td><b>{log.name || '-'}</b><small>{log.role === 'admin' ? 'Administrador' : 'Vendedor'}</small></td><td>{log.email}</td><td><b>{formatDateTime(log.created_at)}</b></td><td>{log.device || '-'}</td><td><small>{log.user_agent || '-'}</small></td></tr>)}</tbody></table>{!filtered.length && <p className="empty">Nenhum registro de login encontrado.</p>}</div>
      <div className="mobile-list">{filtered.map(log => <article key={log.id} className="mobile-lead"><div className="mobile-lead-head"><div><b>{log.name || log.email}</b><small>{log.email}</small></div><strong>{formatDateTime(log.created_at)}</strong></div><div className="mobile-meta"><span>Perfil: {log.role === 'admin' ? 'Administrador' : 'Vendedor'}</span><span>Dispositivo: {log.device || '-'}</span><span>Navegador: {log.user_agent || '-'}</span></div></article>)}{!filtered.length && <p className="empty">Nenhum registro de login encontrado.</p>}</div>
    </section>
  </div>
}



function NegotiationsPage({ profile, profiles, services, leads, activities, settings, reload, notify }) {
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('observacao')
  const [nextContact, setNextContact] = useState('')
  const [proposalValue, setProposalValue] = useState('')
  const [templateDraft, setTemplateDraft] = useState(settings?.whatsapp_template || DEFAULT_WHATSAPP_TEMPLATE)

  useEffect(() => {
    setTemplateDraft(settings?.whatsapp_template || DEFAULT_WHATSAPP_TEMPLATE)
  }, [settings?.whatsapp_template])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter(l => {
      const text = [l.client_name, l.company_name, l.whatsapp, l.email].filter(Boolean).join(' ').toLowerCase()
      return (!q || text.includes(q)) && (statusFilter === 'todos' || l.status === statusFilter)
    })
  }, [leads, search, statusFilter])

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id)
    if (selectedId && !filtered.some(l => l.id === selectedId) && filtered[0]) setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  const lead = leads.find(l => l.id === selectedId) || filtered[0]
  const seller = lead ? profiles.find(p => p.id === lead.vendedor_id) : null
  const service = lead ? services.find(s => s.id === lead.service_id) : null
  const leadActivities = lead ? activities.filter(a => a.lead_id === lead.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : []
  const activeCount = filtered.filter(l => ['novo', 'em_atendimento', 'proposta_enviada', 'negociacao'].includes(l.status)).length
  const followUps = filtered.filter(l => l.next_contact_at).length
  const sentProposals = filtered.filter(l => l.status === 'proposta_enviada' || l.proposal_value > 0).length

  function initialMessage(l = lead) {
    const selectedSeller = l ? profiles.find(p => p.id === l.vendedor_id) : seller
    const selectedService = l ? services.find(s => s.id === l.service_id) : service
    return renderTemplate(settings?.whatsapp_template || DEFAULT_WHATSAPP_TEMPLATE, {
      vendedor: profile.role === 'admin' ? (selectedSeller?.name || profile.name) : profile.name,
      cliente: l?.client_name || 'cliente',
      empresa: l?.company_name || '',
      servico: selectedService?.name || 'um site/sistema profissional',
      valor: money(l?.proposal_value || initialValue(selectedService))
    })
  }

  async function saveTemplate(e) {
    e.preventDefault()
    if (profile.role !== 'admin') return notify('Apenas admin pode alterar a mensagem automática.', 'danger')
    const value = templateDraft.trim() || DEFAULT_WHATSAPP_TEMPLATE
    const { error } = await supabase.from('app_settings').upsert({ key: 'whatsapp_template', value }, { onConflict: 'key' })
    if (error) return notify(error.message, 'danger')
    notify('Mensagem automática atualizada.', 'ok')
    reload()
  }

  async function addActivity(type, description) {
    if (!lead) return
    const { error } = await supabase.from('activities').insert({
      lead_id: lead.id,
      user_id: profile.id,
      type,
      description
    })
    if (error) return notify(error.message, 'danger')
    reload()
  }

  async function startWhatsApp() {
    if (!lead) return notify('Selecione um lead.', 'danger')
    if (!lead.whatsapp) return notify('Esse lead não tem WhatsApp cadastrado.', 'danger')
    const message = initialMessage(lead)
    await addActivity('whatsapp_inicio', `Atendimento iniciado pelo WhatsApp do vendedor. Mensagem inicial:\n${message}`)
    if (lead.status === 'novo') {
      await supabase.from('leads').update({ status: 'em_atendimento' }).eq('id', lead.id)
    }
    const phone = cleanPhone(lead.whatsapp)
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  async function copyMessage() {
    if (!lead) return
    await navigator.clipboard?.writeText(initialMessage(lead))
    notify('Mensagem inicial copiada.', 'ok')
  }

  async function saveNote(e) {
    e.preventDefault()
    if (!lead) return notify('Selecione um lead.', 'danger')
    const text = note.trim()
    if (!text) return notify('Digite o resumo da negociação.', 'danger')
    await addActivity(noteType, text)
    setNote('')
    notify('Registro salvo na negociação.', 'ok')
  }

  async function updateLead(fields, description) {
    if (!lead) return
    const { error } = await supabase.from('leads').update(fields).eq('id', lead.id)
    if (error) return notify(error.message, 'danger')
    if (description) await addActivity('atualizacao', description)
    notify('Negociação atualizada.', 'ok')
    reload()
  }

  async function saveNextContact(e) {
    e.preventDefault()
    if (!nextContact) return notify('Informe a data de retorno.', 'danger')
    await updateLead({ next_contact_at: nextContact }, `Retorno agendado para ${nextContact}.`)
    setNextContact('')
  }

  async function saveProposal(e) {
    e.preventDefault()
    const value = Number(proposalValue || 0)
    if (!value) return notify('Informe o valor da proposta.', 'danger')
    await updateLead({ proposal_value: value, status: 'proposta_enviada' }, `Proposta registrada/enviada no valor de ${money(value)}.`)
    setProposalValue('')
  }

  async function changeStatus(nextStatus) {
    await updateLead({ status: nextStatus, closed_at: nextStatus === 'fechado' ? todayISO() : null }, `Status alterado para ${statusLabel(nextStatus)}.`)
  }

  async function deleteActivity(id) {
    if (profile.role !== 'admin') return notify('Apenas admin pode excluir registros.', 'danger')
    if (!confirm('Excluir esse registro da negociação?')) return
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) return notify(error.message, 'danger')
    notify('Registro excluído.', 'ok')
    reload()
  }

  return <div className="grid gap negotiations-page clean-negotiations">
    <section className="section-title compact-section-title"><div><h3>Negociações pelo WhatsApp</h3><p>Controle simples do processo comercial sem acessar conversas pessoais do vendedor.</p></div><span className="badge ok">WhatsApp do vendedor</span></section>

    <div className="stats compact-stats"><Stat label="Leads filtrados" value={filtered.length} hint="Na busca atual" /><Stat label="Em aberto" value={activeCount} hint="Precisam de acompanhamento" /><Stat label="Com proposta" value={sentProposals} hint="Valor informado" /><Stat label="Retornos" value={followUps} hint="Agendados" /></div>

    {profile.role === 'admin' && <section className="card template-card">
      <div className="form-head"><div><h3>Mensagem automática do WhatsApp</h3><p className="muted">Essa mensagem aparece quando o vendedor clicar em Iniciar WhatsApp.</p></div></div>
      <form onSubmit={saveTemplate} className="template-grid">
        <label>Mensagem padrão<textarea rows="5" value={templateDraft} onChange={e => setTemplateDraft(e.target.value)} /></label>
        <div className="template-side"><h4>Variáveis disponíveis</h4><div className="chips"><span>{'{vendedor}'}</span><span>{'{cliente}'}</span><span>{'{empresa}'}</span><span>{'{servico}'}</span><span>{'{valor}'}</span></div><button className="primary" type="submit">Salvar mensagem</button></div>
      </form>
      <div className="message-preview"><small>Prévia com o lead selecionado</small><p>{lead ? initialMessage(lead) : renderTemplate(templateDraft, { vendedor: profile.name, cliente: 'Cliente', empresa: 'Empresa', servico: 'Site profissional', valor: money(1599) })}</p></div>
    </section>}

    <section className="card negotiation-toolbar clean-toolbar">
      <input placeholder="Buscar por cliente, empresa, telefone ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="todos">Todos os status</option>{STATUS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
    </section>

    <div className="negotiation-shell clean-shell">
      <aside className="card lead-selector-card">
        <div className="form-head"><div><h3>Leads</h3><p className="muted">Escolha um lead para acompanhar.</p></div></div>
        <div className="simple-lead-list">
          {filtered.map(l => {
            const s = services.find(item => item.id === l.service_id)
            const v = profiles.find(p => p.id === l.vendedor_id)
            return <button key={l.id} type="button" className={`simple-lead ${lead?.id === l.id ? 'active' : ''}`} onClick={() => setSelectedId(l.id)}>
              <div><b>{l.client_name}</b><small>{l.company_name || l.whatsapp || 'Sem empresa'}</small></div>
              <div className="simple-lead-meta"><span>{statusLabel(l.status)}</span><small>{s?.name || 'Sem serviço'} • {v?.name || '-'}</small></div>
            </button>
          })}
          {!filtered.length && <p className="empty">Nenhum lead encontrado.</p>}
        </div>
      </aside>

      <section className="card negotiation-detail-card">
        {!lead ? <div className="empty-chat"><h3>Nenhum lead selecionado</h3><p>Cadastre um lead primeiro ou altere os filtros.</p></div> : <>
          <div className="negotiation-summary">
            <div><span>Cliente</span><h3>{lead.client_name}</h3><p>{lead.company_name || 'Sem empresa'} • {lead.whatsapp || 'Sem WhatsApp'}</p></div>
            <div className="summary-badges"><span className="badge">{statusLabel(lead.status)}</span><strong>{money(lead.proposal_value)}</strong></div>
          </div>

          <div className="lead-info-grid">
            <div><small>Serviço</small><b>{service?.name || '-'}</b></div>
            <div><small>Vendedor</small><b>{seller?.name || '-'}</b></div>
            <div><small>Próximo retorno</small><b>{lead.next_contact_at || '-'}</b></div>
          </div>

          <div className="primary-actions-grid">
            <select value={lead.status || 'novo'} onChange={e => changeStatus(e.target.value)}>{STATUS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
            <button type="button" className="primary" onClick={startWhatsApp}>Iniciar WhatsApp</button>
            <button type="button" onClick={copyMessage}>Copiar mensagem</button>
          </div>

          <div className="message-preview seller-preview"><small>Mensagem que será enviada</small><p>{initialMessage(lead)}</p></div>

          <div className="negotiation-actions-clean">
            <form className="mini-card" onSubmit={saveNote}><h4>Registrar atualização</h4><select value={noteType} onChange={e => setNoteType(e.target.value)}><option value="observacao">Resumo da conversa</option><option value="objecao">Objeção do cliente</option><option value="retorno">Retorno feito</option><option value="proposta">Proposta enviada</option><option value="fechamento">Fechamento</option></select><textarea rows="4" placeholder="Ex: Cliente pediu proposta e ficou de responder amanhã." value={note} onChange={e => setNote(e.target.value)} /><button className="primary">Salvar no histórico</button></form>
            <form className="mini-card" onSubmit={saveProposal}><h4>Proposta</h4><input type="number" step="0.01" placeholder="Valor negociado" value={proposalValue} onChange={e => setProposalValue(e.target.value)} /><button>Registrar proposta</button></form>
            <form className="mini-card" onSubmit={saveNextContact}><h4>Retorno</h4><input type="date" value={nextContact} onChange={e => setNextContact(e.target.value)} /><button>Agendar retorno</button></form>
          </div>

          <div className="timeline-card clean-timeline"><div className="form-head"><div><h3>Histórico da negociação</h3><p className="muted">Somente registros do CRM aparecem aqui.</p></div></div><div className="timeline">
            {leadActivities.map(a => { const author = profiles.find(p => p.id === a.user_id); return <article key={a.id} className="timeline-item"><div className="timeline-dot" /><div><div className="timeline-top"><b>{typeLabel(a.type)}</b><small>{formatDateTime(a.created_at)}</small></div><p>{a.description}</p><small>Registrado por: {author?.name || 'Sistema'}</small>{profile.role === 'admin' && <button className="link-danger" onClick={() => deleteActivity(a.id)}>Excluir registro</button>}</div></article> })}
            {!leadActivities.length && <p className="empty">Nenhum registro ainda. Clique em Iniciar WhatsApp ou registre uma atualização.</p>}
          </div></div>
        </>}
      </section>
    </div>
  </div>
}

function ConfigPage({ profile, onLogout, onInstallApp, isStandalone }) {
  return <div className="grid gap"><section className="card"><div className="form-head"><div><h3>Configurações</h3><p>O sistema está conectado ao Supabase e hospedado para rodar via Netlify.</p></div><button className="logout-top" type="button" onClick={onLogout}>Sair do sistema</button></div><div className="info-grid"><div><small>Usuário</small><b>{profile.name}</b></div><div><small>Perfil</small><b>{profile.role}</b></div><div><small>Status</small><b>{profile.active ? 'Ativo' : 'Bloqueado'}</b></div></div></section><section className="card pwa-card"><h3>Instalar como aplicativo</h3><p className="muted">Para abrir como programa no computador, use este botão ou o botão de instalação do Chrome/Edge. Depois remova qualquer atalho antigo e instale novamente.</p><button className="primary" type="button" onClick={onInstallApp}>{isStandalone ? 'Aplicativo já instalado' : 'Instalar aplicativo'}</button></section><section className="card"><h3>Variáveis necessárias no Netlify</h3><pre>VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY</pre><p className="muted">A SERVICE_ROLE fica somente no Netlify. Não coloque essa chave no GitHub.</p></section></div>
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [services, setServices] = useState([])
  const [leads, setLeads] = useState([])
  const [loginLogs, setLoginLogs] = useState([])
  const [activities, setActivities] = useState([])
  const [settings, setSettings] = useState({})
  const [page, setPage] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [error, setError] = useState('')
  const [welcome, setWelcome] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

  const notify = (message, type = '') => { setToast({ message, type }); setTimeout(() => setToast({ message: '', type: '' }), 4500) }

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const onInstalled = () => {
      setInstallPrompt(null)
      setIsStandalone(true)
      notify('Aplicativo instalado com sucesso.', 'ok')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installApp() {
    if (isStandalone) return notify('O sistema já está aberto como aplicativo.', 'ok')
    if (installPrompt) {
      installPrompt.prompt()
      const result = await installPrompt.userChoice
      if (result.outcome === 'accepted') setInstallPrompt(null)
      return
    }
    notify('No Chrome ou Edge, clique no ícone de instalação na barra de endereço e escolha Instalar aplicativo.', 'danger')
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) throw error
    if (!data.active) throw new Error('Seu acesso está bloqueado. Fale com o administrador.')
    setProfile(data)
    return data
  }

  async function loadData(currentProfile = profile) {
    if (!currentProfile) return
    const [profilesRes, servicesRes, leadsRes, loginLogsRes, activitiesRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('sort_order', { ascending: true }),
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      currentProfile.role === 'admin'
        ? supabase.from('login_logs').select('*').order('created_at', { ascending: false }).limit(500)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(1500),
      supabase.from('app_settings').select('*')
    ])
    if (profilesRes.error) notify(profilesRes.error.message, 'danger'); else setProfiles(profilesRes.data || [])
    if (servicesRes.error) notify(servicesRes.error.message, 'danger'); else setServices(servicesRes.data || [])
    if (leadsRes.error) notify(leadsRes.error.message, 'danger'); else setLeads(leadsRes.data || [])
    if (loginLogsRes.error && currentProfile.role === 'admin') notify(loginLogsRes.error.message, 'danger'); else setLoginLogs(loginLogsRes.data || [])
    if (activitiesRes.error) setActivities([]); else setActivities(activitiesRes.data || [])
    if (settingsRes.error) setSettings({}); else setSettings(Object.fromEntries((settingsRes.data || []).map(item => [item.key, item.value])))
  }

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data }) => {
      try {
        if (data.session?.user) {
          setSession(data.session)
          const p = await loadProfile(data.session.user.id)
          await loadData(p)
        }
      } catch (err) { setError(err.message); await supabase.auth.signOut() }
      finally { setLoading(false) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function registerLogin(currentProfile) {
    try {
      await supabase.from('login_logs').insert({
        user_id: currentProfile.id,
        email: currentProfile.email,
        name: currentProfile.name,
        role: currentProfile.role,
        device: deviceLabel(),
        user_agent: navigator.userAgent || ''
      })
    } catch (_) {
      // Não bloqueia o login caso o banco ainda não tenha sido atualizado.
    }
  }

  async function login(email, password) {
    setLoginLoading(true); setError('')
    try {
      if (!isConfigured) throw new Error(getConfigMessage())
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setSession(data.session)
      const p = await loadProfile(data.user.id)
      await registerLogin(p)
      setWelcome(true)
      await loadData(p)
      setTimeout(() => setWelcome(false), 1200)
    } catch (err) { setError(err.message || 'Erro ao entrar no sistema.') }
    finally { setLoginLoading(false) }
  }

  async function logout() { await supabase.auth.signOut(); setSession(null); setProfile(null); setProfiles([]); setLeads([]); setLoginLogs([]); setActivities([]); setSettings({}) }

  const visibleLeads = useMemo(() => leads, [leads])
  const titles = { dashboard: 'Dashboard', leads: 'Leads / Clientes', negociacoes: 'Negociações', servicos: 'Serviços e valores', comissoes: 'Comissões', vendedores: 'Vendedores', login_logs: 'Registros de login', config: 'Configurações' }

  if (loading) return <Welcome />
  if (!session || !profile) return <><Login onLogin={login} loading={loginLoading} error={error} /><Toast {...toast} onClose={() => setToast({ message: '', type: '' })} /></>
  if (welcome) return <Welcome profile={profile} />

  return <>
    <Layout page={page} setPage={setPage} profile={profile} onLogout={logout} onInstallApp={installApp} title={titles[page] || 'RN CRM Vendas'}>
      {page === 'dashboard' && <Dashboard leads={visibleLeads} profiles={profiles} profile={profile} />}
      {page === 'leads' && <LeadsPage profile={profile} profiles={profiles} services={services} leads={visibleLeads} reload={() => loadData(profile)} notify={notify} />}
      {page === 'negociacoes' && <NegotiationsPage profile={profile} profiles={profiles} services={services} leads={visibleLeads} activities={activities} settings={settings} reload={() => loadData(profile)} notify={notify} />}
      {page === 'servicos' && <ServicesPage profile={profile} services={services} reload={() => loadData(profile)} notify={notify} />}
      {page === 'comissoes' && <CommissionsPage leads={visibleLeads} profiles={profiles} />}
      {page === 'vendedores' && profile.role === 'admin' && <SellersPage profiles={profiles} reload={() => loadData(profile)} notify={notify} session={session} />}
      {page === 'login_logs' && profile.role === 'admin' && <LoginLogsPage loginLogs={loginLogs} profiles={profiles} reload={() => loadData(profile)} />}
      {page === 'config' && <ConfigPage profile={profile} onLogout={logout} onInstallApp={installApp} isStandalone={isStandalone} />}
    </Layout>
    <Toast {...toast} onClose={() => setToast({ message: '', type: '' })} />
  </>
}

export default App
