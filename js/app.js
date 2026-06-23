const LOGO = 'assets/logo-rn-vision-pira.png';
const STATUSES = ['Novo', 'Em atendimento', 'Proposta enviada', 'Negociação', 'Fechado', 'Perdido'];
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE_FMT = new Intl.DateTimeFormat('pt-BR');

const config = window.RNCRM_CONFIG || {};
const hasSupabaseConfig = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase);
const sb = hasSupabaseConfig ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) : null;

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const loaderEl = document.getElementById('welcomeLoader');

let state = {
  ready: false,
  user: null,
  page: 'dashboard',
  profiles: [],
  services: [],
  leads: [],
  filters: { search: '', status: '', seller: '', service: '' }
};

function money(value) {
  const n = Number(value || 0);
  return BRL.format(Number.isFinite(n) ? n : 0);
}
function parseMoney(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const normalized = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  return Number(normalized || 0);
}
function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function inCurrentMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function statusClass(status) {
  return String(status || 'Novo').replace(/\s/g, '-');
}
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function toast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 3600);
}
function showWelcome() {
  loaderEl.classList.remove('hidden');
  return new Promise(resolve => setTimeout(() => {
    loaderEl.classList.add('hidden');
    resolve();
  }, 1200));
}
function uid() {
  return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const demo = {
  key: 'rncrm_static_demo_v2',
  defaults() {
    const adminId = 'demo-admin';
    const seller1 = 'demo-seller-1';
    return {
      profiles: [
        { id: adminId, name: 'Rennan Nascimento', email: 'admin@rnvision.com.br', role: 'admin', active: true, commission_rate: 0.15, created_at: new Date().toISOString() },
        { id: seller1, name: 'Vendedor Demo', email: 'vendedor1@rnvision.com.br', role: 'seller', active: true, commission_rate: 0.15, created_at: new Date().toISOString() }
      ],
      services: [
        { id: uid(), name: 'Site Profissional', category: 'Sites', description: 'Site institucional moderno, responsivo e com WhatsApp integrado.', development_value: 1599, setup_integration_value: 0, monthly_value: 0, delivery_time: '7 a 12 dias úteis', payment_terms: '50% entrada e 50% na entrega', sales_pitch: 'Ideal para empresas que querem passar mais profissionalismo, credibilidade e aparecer melhor no Google.', active: true, created_at: new Date().toISOString() },
        { id: uid(), name: 'Sistema Personalizado', category: 'Sistemas', description: 'Sistema sob medida para gestão, controle interno, relatórios e processos.', development_value: 2499, setup_integration_value: 399, monthly_value: 149.9, delivery_time: '15 a 30 dias úteis', payment_terms: 'Projeto + adesão/integração + mensalidade', sales_pitch: 'Para empresas que querem organizar processos e reduzir trabalho manual com um sistema próprio.', active: true, created_at: new Date().toISOString() },
        { id: uid(), name: 'CRM Interno de Vendas', category: 'CRM', description: 'Sistema para controlar vendedores, leads, propostas, comissões e metas.', development_value: 0, setup_integration_value: 299, monthly_value: 99.9, delivery_time: '3 a 7 dias úteis', payment_terms: 'Adesão + mensalidade', sales_pitch: 'Organiza a equipe comercial, evita perda de clientes e mostra o andamento de cada negociação.', active: true, created_at: new Date().toISOString() },
        { id: uid(), name: 'RN Delivery', category: 'Delivery', description: 'Cardápio online com pedidos, painel do restaurante e controle por WhatsApp.', development_value: 0, setup_integration_value: 299, monthly_value: 59.9, delivery_time: '3 a 7 dias úteis', payment_terms: 'Adesão + mensalidade', sales_pitch: 'Transforma o WhatsApp do restaurante em um canal de vendas mais profissional e organizado.', active: true, created_at: new Date().toISOString() }
      ],
      leads: []
    };
  },
  load() {
    const raw = localStorage.getItem(this.key);
    if (!raw) {
      const data = this.defaults();
      localStorage.setItem(this.key, JSON.stringify(data));
      return data;
    }
    return JSON.parse(raw);
  },
  save(data) { localStorage.setItem(this.key, JSON.stringify(data)); }
};

function isAdmin() { return state.user?.role === 'admin'; }
function currentSellerId() { return state.user?.id; }
function getService(id) { return state.services.find(s => s.id === id); }
function getSeller(id) { return state.profiles.find(p => p.id === id); }
function initialInvestment(service) {
  return Number(service?.development_value || 0) + Number(service?.setup_integration_value || 0);
}

async function init() {
  if (hasSupabaseConfig) {
    const { data } = await sb.auth.getSession();
    if (data?.session) await setUserFromSupabase();
  } else {
    const raw = sessionStorage.getItem('rncrm_demo_session');
    if (raw) state.user = JSON.parse(raw);
  }
  if (state.user) await loadAll();
  render();
}

async function setUserFromSupabase() {
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData?.user) {
    state.user = null;
    return;
  }
  const user = userData.user;
  let { data: profile, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (!profile) {
    const payload = { id: user.id, email: user.email, name: user.user_metadata?.name || user.email, role: 'seller', active: true };
    const inserted = await sb.from('profiles').upsert(payload).select('*').single();
    if (inserted.error) throw inserted.error;
    profile = inserted.data;
  }
  state.user = profile;
}

async function login(email, password) {
  if (hasSupabaseConfig) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await setUserFromSupabase();
    if (!state.user.active) throw new Error('Seu acesso está bloqueado. Fale com o administrador.');
  } else {
    const data = demo.load();
    const profile = data.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!profile || password !== '123456') throw new Error('Login demo inválido. Use admin@rnvision.com.br ou vendedor1@rnvision.com.br com senha 123456.');
    if (!profile.active) throw new Error('Usuário bloqueado.');
    state.user = profile;
    sessionStorage.setItem('rncrm_demo_session', JSON.stringify(profile));
  }
  await showWelcome();
  await loadAll();
  state.page = 'dashboard';
  render();
}

async function logout() {
  if (hasSupabaseConfig) await sb.auth.signOut();
  sessionStorage.removeItem('rncrm_demo_session');
  state.user = null;
  state.page = 'dashboard';
  render();
}

async function loadAll() {
  if (hasSupabaseConfig) {
    const [profilesRes, servicesRes, leadsRes] = await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('services').select('*').order('created_at', { ascending: false }),
      sb.from('leads').select('*').order('created_at', { ascending: false })
    ]);
    if (profilesRes.error) throw profilesRes.error;
    if (servicesRes.error) throw servicesRes.error;
    if (leadsRes.error) throw leadsRes.error;
    state.profiles = profilesRes.data || [];
    state.services = servicesRes.data || [];
    state.leads = leadsRes.data || [];
  } else {
    const data = demo.load();
    state.profiles = data.profiles;
    state.services = data.services;
    state.leads = isAdmin() ? data.leads : data.leads.filter(l => l.seller_id === state.user.id);
  }
}

async function saveService(payload, id = null) {
  payload.development_value = parseMoney(payload.development_value);
  payload.setup_integration_value = parseMoney(payload.setup_integration_value);
  payload.monthly_value = parseMoney(payload.monthly_value);
  payload.active = Boolean(payload.active);
  if (hasSupabaseConfig) {
    if (id) {
      const { error } = await sb.from('services').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('services').insert({ ...payload, created_by: state.user.id });
      if (error) throw error;
    }
  } else {
    const data = demo.load();
    if (id) {
      data.services = data.services.map(s => s.id === id ? { ...s, ...payload, updated_at: new Date().toISOString() } : s);
    } else {
      data.services.unshift({ id: uid(), ...payload, created_at: new Date().toISOString() });
    }
    demo.save(data);
  }
  await loadAll();
  render();
  toast('Serviço salvo com sucesso.');
}

async function deleteService(id) {
  if (!confirm('Deseja excluir este serviço?')) return;
  if (hasSupabaseConfig) {
    const { error } = await sb.from('services').delete().eq('id', id);
    if (error) throw error;
  } else {
    const data = demo.load();
    data.services = data.services.filter(s => s.id !== id);
    demo.save(data);
  }
  await loadAll();
  render();
  toast('Serviço excluído.');
}

async function saveLead(payload, id = null) {
  const service = getService(payload.service_id);
  payload.proposal_value = parseMoney(payload.proposal_value || initialInvestment(service));
  payload.monthly_value = parseMoney(payload.monthly_value || service?.monthly_value || 0);
  payload.seller_id = isAdmin() ? (payload.seller_id || state.user.id) : state.user.id;
  payload.updated_at = new Date().toISOString();
  if (payload.status === 'Fechado' && !payload.closed_at) payload.closed_at = new Date().toISOString();
  if (payload.status !== 'Fechado') payload.closed_at = null;

  if (hasSupabaseConfig) {
    if (id) {
      const { error } = await sb.from('leads').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('leads').insert(payload);
      if (error) throw error;
    }
  } else {
    const data = demo.load();
    if (id) {
      data.leads = data.leads.map(l => l.id === id ? { ...l, ...payload } : l);
    } else {
      data.leads.unshift({ id: uid(), ...payload, created_at: new Date().toISOString() });
    }
    demo.save(data);
  }
  await loadAll();
  render();
  toast('Lead salvo com sucesso.');
}

async function deleteLead(id) {
  if (!confirm('Deseja excluir este lead?')) return;
  if (hasSupabaseConfig) {
    const { error } = await sb.from('leads').delete().eq('id', id);
    if (error) throw error;
  } else {
    const data = demo.load();
    data.leads = data.leads.filter(l => l.id !== id);
    demo.save(data);
  }
  await loadAll();
  render();
  toast('Lead excluído.');
}

async function updateProfile(id, payload) {
  payload.active = Boolean(payload.active);
  payload.commission_rate = Number(payload.commission_rate || 0.15);
  if (hasSupabaseConfig) {
    const { error } = await sb.from('profiles').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const data = demo.load();
    data.profiles = data.profiles.map(p => p.id === id ? { ...p, ...payload } : p);
    demo.save(data);
  }
  await loadAll();
  render();
  toast('Vendedor atualizado.');
}

function render() {
  if (!state.user) return renderLogin();
  renderShell();
}

function renderLogin() {
  app.innerHTML = `
    <section class="auth-page">
      <div class="auth-hero">
        <div>
          <img class="hero-logo" src="${LOGO}" alt="RN Vision Pira">
          <div class="hero-content">
            <h1>CRM interno para vendedores</h1>
            <p>Controle seus leads, propostas, serviços, valores, comissões e metas em um painel simples para a equipe comercial.</p>
            <div class="hero-badges">
              <span class="badge">Leads por vendedor</span>
              <span class="badge">Comissão automática</span>
              <span class="badge">Serviços e valores</span>
              <span class="badge">Supabase + Netlify</span>
            </div>
          </div>
        </div>
        <small>Desenvolvido por RN Vision Pira</small>
      </div>
      <div class="auth-card-wrap">
        <form class="auth-card" id="loginForm">
          <img class="mini-logo" src="${LOGO}" alt="RN Vision Pira">
          <h2>Acessar sistema</h2>
          <p>Entre com o login do admin ou vendedor.</p>
          ${!hasSupabaseConfig ? `<div class="setup-alert"><strong>Modo demonstração:</strong> configure o arquivo <b>config.js</b> com Supabase para usar online com banco real.</div>` : ''}
          <div class="form-row">
            <label>E-mail</label>
            <input name="email" type="email" placeholder="admin@rnvision.com.br" required value="${hasSupabaseConfig ? '' : 'admin@rnvision.com.br'}">
          </div>
          <div class="form-row">
            <label>Senha</label>
            <input name="password" type="password" placeholder="Digite sua senha" required value="${hasSupabaseConfig ? '' : '123456'}">
          </div>
          <button class="btn primary block" type="submit">Entrar no CRM</button>
          <p class="helper" style="margin-top: 14px;">Demo local: admin@rnvision.com.br / 123456 ou vendedor1@rnvision.com.br / 123456</p>
        </form>
      </div>
    </section>
  `;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await login(fd.get('email'), fd.get('password'));
    } catch (err) {
      toast(err.message || 'Erro ao fazer login.', 'error');
    }
  });
}

function renderShell() {
  const navItems = [
    ['dashboard', '📊', 'Dashboard'],
    ['leads', '🤝', 'Leads e propostas'],
    ['services', '💼', 'Serviços e valores'],
    ...(isAdmin() ? [['sellers', '👥', 'Vendedores']] : []),
    ['reports', '💰', 'Comissões e metas'],
    ['settings', '⚙️', 'Configuração']
  ];
  app.innerHTML = `
    <section class="app-shell">
      <aside class="sidebar">
        <img class="sidebar-logo" src="${LOGO}" alt="RN Vision Pira">
        <div class="user-chip">
          <strong>${escapeHtml(state.user.name || state.user.email)}</strong>
          <span>${isAdmin() ? 'Administrador' : 'Vendedor'} • ${escapeHtml(state.user.email)}</span>
        </div>
        <nav class="nav">
          ${navItems.map(([page, icon, label]) => `<button class="${state.page === page ? 'active' : ''}" data-page="${page}"><span>${icon}</span>${label}</button>`).join('')}
        </nav>
        <button class="btn danger" id="logoutBtn">Sair do sistema</button>
        <div class="sidebar-footer">RN CRM Vendas<br>Netlify + Supabase • v1 estática</div>
      </aside>
      <div class="content" id="content"></div>
    </section>
  `;
  document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => {
    state.page = btn.dataset.page;
    renderShell();
  }));
  document.getElementById('logoutBtn').addEventListener('click', logout);
  renderPage();
}

function renderPage() {
  const content = document.getElementById('content');
  if (!content) return;
  if (state.page === 'dashboard') content.innerHTML = pageDashboard();
  if (state.page === 'leads') content.innerHTML = pageLeads();
  if (state.page === 'services') content.innerHTML = pageServices();
  if (state.page === 'sellers') content.innerHTML = pageSellers();
  if (state.page === 'reports') content.innerHTML = pageReports();
  if (state.page === 'settings') content.innerHTML = pageSettings();
  attachPageEvents();
}

function filteredLeads() {
  const f = state.filters;
  return state.leads.filter(l => {
    const search = `${l.client_name || ''} ${l.company || ''} ${l.whatsapp || ''} ${l.email || ''}`.toLowerCase();
    return (!f.search || search.includes(f.search.toLowerCase())) &&
      (!f.status || l.status === f.status) &&
      (!f.seller || l.seller_id === f.seller) &&
      (!f.service || l.service_id === f.service);
  });
}
function metrics(leads = state.leads) {
  const total = leads.length;
  const open = leads.filter(l => !['Fechado', 'Perdido'].includes(l.status)).length;
  const won = leads.filter(l => l.status === 'Fechado').length;
  const proposal = leads.reduce((sum, l) => sum + Number(l.proposal_value || 0), 0);
  const wonValue = leads.filter(l => l.status === 'Fechado').reduce((sum, l) => sum + Number(l.proposal_value || 0), 0);
  const commission = leads.filter(l => l.status === 'Fechado' && inCurrentMonth(l.closed_at || l.updated_at || l.created_at)).reduce((sum, l) => {
    const seller = getSeller(l.seller_id);
    return sum + Number(l.proposal_value || 0) * Number(seller?.commission_rate || 0.15);
  }, 0);
  return { total, open, won, proposal, wonValue, commission };
}

function pageHeader(title, subtitle, actions = '') {
  return `<div class="topbar"><div class="page-title"><h1>${title}</h1><p>${subtitle}</p></div><div class="action-row">${actions}</div></div>`;
}
function metricCards(m) {
  return `<div class="cards">
    <div class="card metric"><span>Total de leads</span><strong>${m.total}</strong><em>Clientes cadastrados</em></div>
    <div class="card metric"><span>Em andamento</span><strong>${m.open}</strong><em>Negociações abertas</em></div>
    <div class="card metric"><span>Fechados</span><strong>${m.won}</strong><em>Vendas concluídas</em></div>
    <div class="card metric"><span>Comissão do mês</span><strong>${money(m.commission)}</strong><em>Base: vendas fechadas</em></div>
  </div>`;
}

function pageDashboard() {
  const m = metrics();
  const lastLeads = filteredLeads().slice(0, 6);
  return `
    ${pageHeader('Dashboard comercial', 'Visão geral de leads, propostas, vendas e comissões.', '<button class="btn primary" data-open-lead>Novo lead</button>')}
    ${metricCards(m)}
    <div class="grid-2">
      <section class="panel">
        <div class="panel-header"><div><h2>Últimos leads</h2><p>Acompanhamento rápido das negociações.</p></div></div>
        ${lastLeads.length ? leadTable(lastLeads, true) : `<div class="empty">Nenhum lead cadastrado ainda.</div>`}
      </section>
      <section class="panel">
        <div class="panel-header"><div><h2>Resumo financeiro</h2><p>Valores cadastrados nas propostas.</p></div></div>
        <div class="price-stack">
          <div class="price-line"><span>Total em propostas</span><strong>${money(m.proposal)}</strong></div>
          <div class="price-line"><span>Total vendido</span><strong>${money(m.wonValue)}</strong></div>
          <div class="price-line"><span>Comissão estimada do mês</span><strong>${money(m.commission)}</strong></div>
          <div class="price-line"><span>Serviços ativos</span><strong>${state.services.filter(s => s.active).length}</strong></div>
        </div>
      </section>
    </div>
  `;
}

function pageLeads() {
  const leads = filteredLeads();
  return `
    ${pageHeader('Leads e propostas', 'Cadastre clientes, serviços, status, valores e próximos retornos.', '<button class="btn primary" data-open-lead>Novo lead</button>')}
    <section class="panel">
      <div class="filters">
        <input placeholder="Buscar por cliente, empresa, telefone ou e-mail" value="${escapeHtml(state.filters.search)}" data-filter="search">
        <select data-filter="status"><option value="">Todos os status</option>${STATUSES.map(s => `<option ${state.filters.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        ${isAdmin() ? `<select data-filter="seller"><option value="">Todos os vendedores</option>${state.profiles.filter(p => p.role === 'seller').map(p => `<option value="${p.id}" ${state.filters.seller === p.id ? 'selected' : ''}>${escapeHtml(p.name || p.email)}</option>`).join('')}</select>` : `<input disabled value="Meus leads">`}
        <select data-filter="service"><option value="">Todos os serviços</option>${state.services.map(s => `<option value="${s.id}" ${state.filters.service === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select>
      </div>
      ${leads.length ? leadTable(leads) : `<div class="empty">Nenhum lead encontrado. Clique em “Novo lead” para cadastrar.</div>`}
    </section>
  `;
}

function leadTable(leads, compact = false) {
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>Cliente</th><th>Serviço</th>${isAdmin() ? '<th>Vendedor</th>' : ''}<th>Status</th><th>Proposta</th><th>Retorno</th><th>Ações</th>
    </tr></thead>
    <tbody>
      ${leads.map(l => {
        const service = getService(l.service_id);
        const seller = getSeller(l.seller_id);
        return `<tr>
          <td><strong>${escapeHtml(l.client_name || 'Sem nome')}</strong><div class="muted">${escapeHtml(l.company || '')} ${l.whatsapp ? '• ' + escapeHtml(l.whatsapp) : ''}</div></td>
          <td>${escapeHtml(service?.name || 'Não informado')}<div class="muted">Mensal: ${money(l.monthly_value || service?.monthly_value || 0)}</div></td>
          ${isAdmin() ? `<td>${escapeHtml(seller?.name || seller?.email || '—')}</td>` : ''}
          <td><span class="status ${statusClass(l.status)}">${escapeHtml(l.status || 'Novo')}</span></td>
          <td><strong>${money(l.proposal_value)}</strong></td>
          <td>${l.next_follow_up ? DATE_FMT.format(new Date(l.next_follow_up + 'T12:00:00')) : '—'}</td>
          <td><div class="action-row"><button class="btn small" data-open-lead="${l.id}">Editar</button>${!compact ? `<button class="btn small danger" data-delete-lead="${l.id}">Excluir</button>` : ''}</div></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;
}

function pageServices() {
  return `
    ${pageHeader('Serviços e valores', 'Tabela comercial para vendedores consultarem e venderem com segurança.', isAdmin() ? '<button class="btn primary" data-open-service>Novo serviço</button>' : '')}
    <div class="service-grid">
      ${state.services.filter(s => isAdmin() || s.active).map(s => `
        <article class="panel service-card">
          <div class="panel-header"><div><h2>${escapeHtml(s.name)}</h2><p>${escapeHtml(s.category || 'Serviço')}</p></div><span class="status ${s.active ? 'Fechado' : 'Perdido'}">${s.active ? 'Ativo' : 'Inativo'}</span></div>
          <p>${escapeHtml(s.description || '')}</p>
          <div class="price-stack">
            <div class="price-line"><span>Desenvolvimento/projeto</span><strong>${money(s.development_value)}</strong></div>
            <div class="price-line"><span>Adesão + integração</span><strong>${money(s.setup_integration_value)}</strong></div>
            <div class="price-line"><span>Mensalidade</span><strong>${money(s.monthly_value)}</strong></div>
            <div class="price-line"><span>Investimento inicial</span><strong>${money(initialInvestment(s))}</strong></div>
          </div>
          <p><strong>Prazo:</strong> ${escapeHtml(s.delivery_time || 'A combinar')}</p>
          <p><strong>Condição:</strong> ${escapeHtml(s.payment_terms || 'A combinar')}</p>
          <p><strong>Argumento:</strong> ${escapeHtml(s.sales_pitch || '')}</p>
          <div class="action-row">
            <button class="btn small success" data-copy-service="${s.id}">Copiar texto</button>
            ${isAdmin() ? `<button class="btn small" data-open-service="${s.id}">Editar</button><button class="btn small danger" data-delete-service="${s.id}">Excluir</button>` : ''}
          </div>
        </article>`).join('') || `<div class="empty">Nenhum serviço cadastrado.</div>`}
    </div>
  `;
}

function pageSellers() {
  const sellers = state.profiles.filter(p => p.role === 'seller');
  return `
    ${pageHeader('Vendedores', 'Controle quem acessa o CRM e acompanhe o desempenho da equipe.')}
    <section class="panel">
      <div class="setup-alert"><strong>Como cadastrar vendedor:</strong> crie o usuário em Supabase > Authentication > Users. Depois volte aqui, atualize a página e edite nome, status e comissão.</div>
      ${sellers.length ? `<div class="table-wrap"><table><thead><tr><th>Vendedor</th><th>Status</th><th>Comissão</th><th>Leads</th><th>Fechados mês</th><th>Ações</th></tr></thead><tbody>
        ${sellers.map(p => {
          const sellerLeads = state.leads.filter(l => l.seller_id === p.id);
          const wonMonth = sellerLeads.filter(l => l.status === 'Fechado' && inCurrentMonth(l.closed_at || l.updated_at || l.created_at));
          return `<tr>
            <td><strong>${escapeHtml(p.name || p.email)}</strong><div class="muted">${escapeHtml(p.email)}</div></td>
            <td><span class="status ${p.active ? 'Fechado' : 'Perdido'}">${p.active ? 'Ativo' : 'Bloqueado'}</span></td>
            <td>${Number(p.commission_rate || 0.15) * 100}%</td>
            <td>${sellerLeads.length}</td>
            <td>${wonMonth.length}</td>
            <td><button class="btn small" data-open-seller="${p.id}">Editar</button></td>
          </tr>`;
        }).join('')}
      </tbody></table></div>` : `<div class="empty">Nenhum vendedor encontrado.</div>`}
    </section>
  `;
}

function sellerReportRows() {
  const sellers = isAdmin() ? state.profiles.filter(p => p.role === 'seller') : [state.user];
  return sellers.map(seller => {
    const sellerLeads = state.leads.filter(l => l.seller_id === seller.id);
    const wonMonth = sellerLeads.filter(l => l.status === 'Fechado' && inCurrentMonth(l.closed_at || l.updated_at || l.created_at));
    const sales = wonMonth.reduce((sum, l) => sum + Number(l.proposal_value || 0), 0);
    const commission = sales * Number(seller.commission_rate || 0.15);
    const bonus = wonMonth.length >= 15 ? 1000 : wonMonth.length >= 10 ? 500 : 0;
    return { seller, leads: sellerLeads.length, won: wonMonth.length, sales, commission, bonus, total: commission + bonus };
  });
}
function pageReports() {
  const rows = sellerReportRows();
  return `
    ${pageHeader('Comissões e metas', 'Cálculo automático com 15% sobre vendas fechadas e bônus mensal por desempenho.')}
    <div class="cards">
      <div class="card metric"><span>Bônus 10 vendas</span><strong>${money(500)}</strong><em>Não cumulativo</em></div>
      <div class="card metric"><span>Bônus 15 vendas</span><strong>${money(1000)}</strong><em>Considera maior bônus</em></div>
      <div class="card metric"><span>Comissão padrão</span><strong>15%</strong><em>Sobre valor líquido/proposta</em></div>
      <div class="card metric"><span>Mês atual</span><strong>${todayMonth()}</strong><em>Base do relatório</em></div>
    </div>
    <section class="panel">
      <div class="table-wrap"><table><thead><tr><th>Vendedor</th><th>Leads</th><th>Vendas mês</th><th>Vendido</th><th>Comissão</th><th>Bônus</th><th>Total a receber</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><strong>${escapeHtml(r.seller.name || r.seller.email)}</strong><div class="muted">${escapeHtml(r.seller.email)}</div></td><td>${r.leads}</td><td>${r.won}</td><td>${money(r.sales)}</td><td>${money(r.commission)}</td><td>${money(r.bonus)}</td><td><strong>${money(r.total)}</strong></td></tr>`).join('')}
      </tbody></table></div>
    </section>
  `;
}

function pageSettings() {
  return `
    ${pageHeader('Configuração', 'Informações importantes para manter o CRM funcionando.')}
    <section class="panel">
      <div class="panel-header"><div><h2>Status da conexão</h2><p>Veja se o sistema está usando Supabase real ou modo demonstração.</p></div></div>
      <div class="price-stack">
        <div class="price-line"><span>Modo atual</span><strong>${hasSupabaseConfig ? 'Supabase conectado' : 'Demonstração local'}</strong></div>
        <div class="price-line"><span>Hospedagem recomendada</span><strong>Netlify estático</strong></div>
        <div class="price-line"><span>Build command</span><strong>deixar vazio</strong></div>
        <div class="price-line"><span>Publish directory</span><strong>.</strong></div>
      </div>
      <div class="setup-alert" style="margin-top: 16px;">
        Esta versão não usa npm, React ou Vite. Ela foi feita para resolver erro de deploy. Basta subir os arquivos na hospedagem e configurar o <b>config.js</b> com as chaves públicas do Supabase.
      </div>
    </section>
  `;
}

function attachPageEvents() {
  document.querySelectorAll('[data-open-lead]').forEach(btn => btn.addEventListener('click', () => openLeadModal(btn.dataset.openLead || null)));
  document.querySelectorAll('[data-delete-lead]').forEach(btn => btn.addEventListener('click', async () => safe(() => deleteLead(btn.dataset.deleteLead))));
  document.querySelectorAll('[data-open-service]').forEach(btn => btn.addEventListener('click', () => openServiceModal(btn.dataset.openService || null)));
  document.querySelectorAll('[data-delete-service]').forEach(btn => btn.addEventListener('click', async () => safe(() => deleteService(btn.dataset.deleteService))));
  document.querySelectorAll('[data-copy-service]').forEach(btn => btn.addEventListener('click', () => copyService(btn.dataset.copyService)));
  document.querySelectorAll('[data-open-seller]').forEach(btn => btn.addEventListener('click', () => openSellerModal(btn.dataset.openSeller)));
  document.querySelectorAll('[data-filter]').forEach(input => input.addEventListener('input', () => {
    state.filters[input.dataset.filter] = input.value;
    renderShell();
  }));
}
async function safe(fn) {
  try { await fn(); } catch (err) { toast(err.message || 'Erro ao executar ação.', 'error'); }
}

function openModal(html) {
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(el);
  el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
  el.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => el.remove()));
  return el;
}

function openLeadModal(id) {
  const lead = id ? state.leads.find(l => l.id === id) : {};
  const selectedService = getService(lead.service_id) || state.services[0];
  const sellers = state.profiles.filter(p => p.role === 'seller' && p.active);
  const el = openModal(`
    <div class="modal-head"><div><h2>${id ? 'Editar lead' : 'Novo lead'}</h2><p>Preencha os dados do cliente e da proposta.</p></div><button class="btn small" data-close>Fechar</button></div>
    <form id="leadForm" class="form-grid">
      <div class="form-row"><label>Nome do cliente</label><input name="client_name" required value="${escapeHtml(lead.client_name || '')}"></div>
      <div class="form-row"><label>Empresa</label><input name="company" value="${escapeHtml(lead.company || '')}"></div>
      <div class="form-row"><label>WhatsApp</label><input name="whatsapp" value="${escapeHtml(lead.whatsapp || '')}" placeholder="(19) 99999-9999"></div>
      <div class="form-row"><label>E-mail</label><input name="email" type="email" value="${escapeHtml(lead.email || '')}"></div>
      <div class="form-row"><label>Serviço</label><select name="service_id" id="leadService">${state.services.filter(s => s.active || isAdmin()).map(s => `<option value="${s.id}" ${lead.service_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Status</label><select name="status">${STATUSES.map(s => `<option ${((lead.status || 'Novo') === s) ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      ${isAdmin() ? `<div class="form-row"><label>Vendedor responsável</label><select name="seller_id">${sellers.map(s => `<option value="${s.id}" ${((lead.seller_id || state.user.id) === s.id) ? 'selected' : ''}>${escapeHtml(s.name || s.email)}</option>`).join('')}</select></div>` : ''}
      <div class="form-row"><label>Origem</label><input name="source" value="${escapeHtml(lead.source || '')}" placeholder="Instagram, WhatsApp, indicação..."></div>
      <div class="form-row"><label>Valor da proposta</label><input name="proposal_value" id="proposalValue" value="${lead.proposal_value ?? initialInvestment(selectedService)}"></div>
      <div class="form-row"><label>Mensalidade</label><input name="monthly_value" id="monthlyValue" value="${lead.monthly_value ?? selectedService?.monthly_value ?? 0}"></div>
      <div class="form-row"><label>Próximo retorno</label><input name="next_follow_up" type="date" value="${escapeHtml(lead.next_follow_up || '')}"></div>
      <div class="form-row full"><label>Observações</label><textarea name="notes" placeholder="Resumo da conversa, dor do cliente, próximos passos...">${escapeHtml(lead.notes || '')}</textarea></div>
      <div class="modal-actions full"><button class="btn" type="button" data-close>Cancelar</button><button class="btn primary" type="submit">Salvar lead</button></div>
    </form>
  `);
  const serviceSelect = el.querySelector('#leadService');
  serviceSelect?.addEventListener('change', () => {
    const s = getService(serviceSelect.value);
    el.querySelector('#proposalValue').value = initialInvestment(s);
    el.querySelector('#monthlyValue').value = s?.monthly_value || 0;
  });
  el.querySelector('#leadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    await safe(async () => { await saveLead(fd, id); el.remove(); });
  });
}

function openServiceModal(id) {
  const s = id ? state.services.find(x => x.id === id) : { active: true };
  const el = openModal(`
    <div class="modal-head"><div><h2>${id ? 'Editar serviço' : 'Novo serviço'}</h2><p>Valores usados pelos vendedores nas propostas.</p></div><button class="btn small" data-close>Fechar</button></div>
    <form id="serviceForm" class="form-grid">
      <div class="form-row"><label>Nome do serviço</label><input name="name" required value="${escapeHtml(s.name || '')}"></div>
      <div class="form-row"><label>Categoria</label><input name="category" value="${escapeHtml(s.category || '')}" placeholder="Sites, Sistemas, CRM..."></div>
      <div class="form-row"><label>Valor desenvolvimento / projeto</label><input name="development_value" value="${s.development_value ?? 0}"></div>
      <div class="form-row"><label>Valor adesão + integração</label><input name="setup_integration_value" value="${s.setup_integration_value ?? 0}"></div>
      <div class="form-row"><label>Valor mensalidade</label><input name="monthly_value" value="${s.monthly_value ?? 0}"></div>
      <div class="form-row"><label>Prazo de entrega</label><input name="delivery_time" value="${escapeHtml(s.delivery_time || '')}"></div>
      <div class="form-row full"><label>Condição de pagamento</label><input name="payment_terms" value="${escapeHtml(s.payment_terms || '')}"></div>
      <div class="form-row full"><label>Descrição</label><textarea name="description">${escapeHtml(s.description || '')}</textarea></div>
      <div class="form-row full"><label>Argumento de venda</label><textarea name="sales_pitch">${escapeHtml(s.sales_pitch || '')}</textarea></div>
      <div class="form-row full"><label><input type="checkbox" name="active" ${s.active !== false ? 'checked' : ''} style="width:auto; margin-right:8px;"> Serviço ativo para vendedores</label></div>
      <div class="modal-actions full"><button class="btn" type="button" data-close>Cancelar</button><button class="btn primary" type="submit">Salvar serviço</button></div>
    </form>
  `);
  el.querySelector('#serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    fd.active = e.currentTarget.elements.active.checked;
    await safe(async () => { await saveService(fd, id); el.remove(); });
  });
}

function openSellerModal(id) {
  const p = state.profiles.find(x => x.id === id);
  if (!p) return;
  const el = openModal(`
    <div class="modal-head"><div><h2>Editar vendedor</h2><p>${escapeHtml(p.email)}</p></div><button class="btn small" data-close>Fechar</button></div>
    <form id="sellerForm" class="form-grid">
      <div class="form-row"><label>Nome</label><input name="name" value="${escapeHtml(p.name || '')}" required></div>
      <div class="form-row"><label>Comissão</label><select name="commission_rate"><option value="0.15" ${Number(p.commission_rate || 0.15) === 0.15 ? 'selected' : ''}>15%</option><option value="0.10" ${Number(p.commission_rate) === 0.10 ? 'selected' : ''}>10%</option><option value="0.20" ${Number(p.commission_rate) === 0.20 ? 'selected' : ''}>20%</option></select></div>
      <div class="form-row full"><label><input type="checkbox" name="active" ${p.active ? 'checked' : ''} style="width:auto; margin-right:8px;"> Vendedor ativo</label></div>
      <div class="modal-actions full"><button class="btn" type="button" data-close>Cancelar</button><button class="btn primary" type="submit">Salvar vendedor</button></div>
    </form>
  `);
  el.querySelector('#sellerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    fd.active = e.currentTarget.elements.active.checked;
    await safe(async () => { await updateProfile(id, fd); el.remove(); });
  });
}

function copyService(id) {
  const s = getService(id);
  if (!s) return;
  const text = `Olá! Tenho uma solução da RN Vision Pira que pode ajudar sua empresa:\n\n${s.name}\n${s.description || ''}\n\nInvestimento:\n• Desenvolvimento/projeto: ${money(s.development_value)}\n• Adesão + integração: ${money(s.setup_integration_value)}\n• Mensalidade: ${money(s.monthly_value)}\n\nPrazo: ${s.delivery_time || 'A combinar'}\nCondição: ${s.payment_terms || 'A combinar'}\n\n${s.sales_pitch || ''}`;
  navigator.clipboard?.writeText(text).then(() => toast('Texto copiado para enviar ao cliente.')).catch(() => toast('Não foi possível copiar automaticamente.', 'error'));
}

window.addEventListener('error', (event) => toast(event.message || 'Erro inesperado.', 'error'));
init().catch(err => {
  console.error(err);
  toast(err.message || 'Erro ao iniciar o sistema.', 'error');
  renderLogin();
});
