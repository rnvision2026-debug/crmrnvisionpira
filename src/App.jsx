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
const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v) => `${Math.round(Number(v || 0) * 100)}%`
const todayISO = () => new Date().toISOString()
const currentMonth = () => new Date().toISOString().slice(0, 7)
const cleanPhone = (phone = '') => phone.replace(/\D/g, '')
const initialValue = (service) => Number(service?.development_price || 0) + Number(service?.setup_integration_price || 0)
const calcBonus = (count) => count >= 15 ? 1000 : count >= 10 ? 500 : 0

const blankLead = {
  client_name: '', company_name: '', whatsapp: '', email: '', origin: 'WhatsApp',
  status: 'novo', proposal_value: '', notes: '', next_contact_at: '', loss_reason: '', service_id: ''
}
const blankService = {
  name: '', category: 'Sites', description: '', development_price: '', setup_integration_price: '', monthly_price: '',
  payment_terms: '50% para iniciar e 50% na entrega, após aprovação.', delivery_time: '7 a 15 dias úteis', sales_arguments: '', active: true, sort_order: 0
}
const blankSeller = { name: '', email: '', password: '', phone: '', commission_rate: 0.15 }

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

function Sidebar({ page, setPage, profile, onLogout }) {
  const items = [
    ['dashboard', 'Dashboard', '📊'], ['leads', 'Leads', '👥'], ['servicos', 'Serviços e valores', '💼'], ['comissoes', 'Comissões', '💰'],
    ...(profile.role === 'admin' ? [['vendedores', 'Vendedores', '🧑‍💼']] : []), ['config', 'Configurações', '⚙️']
  ]
  return <aside className="sidebar">
    <img src={LOGO} className="side-logo" alt="RN Vision Pira" />
    <nav>{items.map(([id, label, icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><span>{icon}</span>{label}</button>)}</nav>
    <div className="profile-box"><div className="avatar">{profile.name?.[0] || 'R'}</div><div><b>{profile.name}</b><small>{profile.role === 'admin' ? 'Administrador' : 'Vendedor'}</small></div></div>
    <button className="logout" onClick={onLogout}>Sair</button>
  </aside>
}

function Layout({ page, setPage, profile, onLogout, title, children }) {
  return <div className="app"><Sidebar page={page} setPage={setPage} profile={profile} onLogout={onLogout} /><main><header className="topbar"><div><h2>{title}</h2><p>{profile.role === 'admin' ? 'Controle completo da equipe comercial.' : 'Acompanhe seus leads, retornos e comissões.'}</p></div><span className="online">Supabase conectado</span></header>{children}</main></div>
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
    if (!confirm('Excluir este lead?')) return
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) return notify(error.message, 'danger')
    notify('Lead excluído.', 'ok'); reload()
  }
  function copyLead(l) {
    const service = services.find(s => s.id === l.service_id)
    const msg = `Olá, ${l.client_name}. Tudo bem?\n\nConforme conversamos, segue a proposta para ${service?.name || 'o serviço solicitado'}.\nInvestimento inicial: ${money(l.proposal_value)}.\n\nFico à disposição para avançarmos.`
    navigator.clipboard?.writeText(msg); notify('Mensagem copiada.', 'ok')
  }
  return <div className="grid gap">
    <section className="toolbar"><input placeholder="Buscar lead..." value={search} onChange={e => setSearch(e.target.value)} /><select value={status} onChange={e => setStatus(e.target.value)}><option value="todos">Todos os status</option>{STATUS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><button className="primary" onClick={() => { setEditing(null); setShow(true) }}>+ Novo lead</button></section>
    {show && <LeadForm profile={profile} profiles={profiles} services={services} editing={editing} onCancel={() => { setShow(false); setEditing(null) }} onSave={saveLead} />}
    <section className="card"><div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Serviço</th><th>Status</th><th>Valor</th><th>Retorno</th><th>Vendedor</th><th>Ações</th></tr></thead><tbody>{filtered.map(l => { const seller = profiles.find(p => p.id === l.vendedor_id); const service = services.find(s => s.id === l.service_id); return <tr key={l.id}><td><b>{l.client_name}</b><small>{l.company_name || l.whatsapp || '-'}</small></td><td>{service?.name || '-'}</td><td><span className={`status ${l.status}`}>{statusLabel(l.status)}</span></td><td><b>{money(l.proposal_value)}</b></td><td>{l.next_contact_at || '-'}</td><td>{seller?.name || '-'}</td><td className="actions"><button onClick={() => copyLead(l)}>Copiar</button>{l.whatsapp && <a target="_blank" rel="noreferrer" href={`https://wa.me/55${cleanPhone(l.whatsapp)}`}>WhatsApp</a>}<button onClick={() => { setEditing(l); setShow(true) }}>Editar</button>{profile.role === 'admin' && <button className="danger" onClick={() => removeLead(l.id)}>Excluir</button>}</td></tr> })}</tbody></table>{!filtered.length && <p className="empty">Nenhum lead encontrado.</p>}</div></section>
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
  async function createSeller(e) {
    e.preventDefault()
    const res = await fetch('/.netlify/functions/create-seller', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) return notify(data.error || 'Erro ao criar vendedor.', 'danger')
    setForm(blankSeller); notify('Vendedor criado com login próprio.', 'ok'); reload()
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
    const res = await fetch('/.netlify/functions/reset-seller-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(reset) })
    const data = await res.json()
    if (!res.ok) return notify(data.error || 'Erro ao trocar senha.', 'danger')
    setReset({ user_id: '', password: '' }); notify('Senha alterada.', 'ok')
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

function ConfigPage({ profile }) {
  return <div className="grid gap"><section className="card"><h3>Configurações</h3><p>O sistema está conectado ao Supabase e hospedado para rodar via Netlify.</p><div className="info-grid"><div><small>Usuário</small><b>{profile.name}</b></div><div><small>Perfil</small><b>{profile.role}</b></div><div><small>Status</small><b>{profile.active ? 'Ativo' : 'Bloqueado'}</b></div></div></section><section className="card"><h3>Variáveis necessárias no Netlify</h3><pre>VITE_SUPABASE_URL\nVITE_SUPABASE_ANON_KEY\nSUPABASE_SERVICE_ROLE_KEY</pre><p className="muted">A SERVICE_ROLE fica somente no Netlify. Não coloque essa chave no GitHub.</p></section></div>
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [services, setServices] = useState([])
  const [leads, setLeads] = useState([])
  const [page, setPage] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [error, setError] = useState('')
  const [welcome, setWelcome] = useState(false)
  const [toast, setToast] = useState({ message: '', type: '' })

  const notify = (message, type = '') => { setToast({ message, type }); setTimeout(() => setToast({ message: '', type: '' }), 4500) }

  async function loadProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) throw error
    if (!data.active) throw new Error('Seu acesso está bloqueado. Fale com o administrador.')
    setProfile(data)
    return data
  }

  async function loadData(currentProfile = profile) {
    if (!currentProfile) return
    const [profilesRes, servicesRes, leadsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('sort_order', { ascending: true }),
      supabase.from('leads').select('*').order('created_at', { ascending: false })
    ])
    if (profilesRes.error) notify(profilesRes.error.message, 'danger'); else setProfiles(profilesRes.data || [])
    if (servicesRes.error) notify(servicesRes.error.message, 'danger'); else setServices(servicesRes.data || [])
    if (leadsRes.error) notify(leadsRes.error.message, 'danger'); else setLeads(leadsRes.data || [])
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

  async function login(email, password) {
    setLoginLoading(true); setError('')
    try {
      if (!isConfigured) throw new Error(getConfigMessage())
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setSession(data.session)
      const p = await loadProfile(data.user.id)
      setWelcome(true)
      await loadData(p)
      setTimeout(() => setWelcome(false), 1200)
    } catch (err) { setError(err.message || 'Erro ao entrar no sistema.') }
    finally { setLoginLoading(false) }
  }

  async function logout() { await supabase.auth.signOut(); setSession(null); setProfile(null); setProfiles([]); setLeads([]) }

  const visibleLeads = useMemo(() => leads, [leads])
  const titles = { dashboard: 'Dashboard', leads: 'Leads / Clientes', servicos: 'Serviços e valores', comissoes: 'Comissões', vendedores: 'Vendedores', config: 'Configurações' }

  if (loading) return <Welcome />
  if (!session || !profile) return <><Login onLogin={login} loading={loginLoading} error={error} /><Toast {...toast} onClose={() => setToast({ message: '', type: '' })} /></>
  if (welcome) return <Welcome profile={profile} />

  return <>
    <Layout page={page} setPage={setPage} profile={profile} onLogout={logout} title={titles[page] || 'RN CRM Vendas'}>
      {page === 'dashboard' && <Dashboard leads={visibleLeads} profiles={profiles} profile={profile} />}
      {page === 'leads' && <LeadsPage profile={profile} profiles={profiles} services={services} leads={visibleLeads} reload={() => loadData(profile)} notify={notify} />}
      {page === 'servicos' && <ServicesPage profile={profile} services={services} reload={() => loadData(profile)} notify={notify} />}
      {page === 'comissoes' && <CommissionsPage leads={visibleLeads} profiles={profiles} />}
      {page === 'vendedores' && profile.role === 'admin' && <SellersPage profiles={profiles} reload={() => loadData(profile)} notify={notify} session={session} />}
      {page === 'config' && <ConfigPage profile={profile} />}
    </Layout>
    <Toast {...toast} onClose={() => setToast({ message: '', type: '' })} />
  </>
}

export default App
