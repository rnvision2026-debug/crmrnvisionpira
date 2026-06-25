-- RN CRM Vendas - Schema Supabase
-- 1) Cole e execute este arquivo no SQL Editor do Supabase.
-- 2) Crie o usuário admin em Authentication > Users.
-- 3) Execute o arquivo supabase/admin_setup.sql.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  active boolean not null default true,
  commission_rate numeric(5,4) not null default 0.1500,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Sites',
  description text,
  development_price numeric(12,2) not null default 0,
  setup_integration_price numeric(12,2) not null default 0,
  monthly_price numeric(12,2) not null default 0,
  payment_terms text,
  delivery_time text,
  sales_arguments text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references public.profiles(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  client_name text not null,
  company_name text,
  whatsapp text,
  email text,
  origin text not null default 'WhatsApp',
  status text not null default 'novo' check (status in ('novo','em_atendimento','proposta_enviada','negociacao','fechado','perdido')),
  proposal_value numeric(12,2) not null default 0,
  notes text,
  next_contact_at date,
  closed_at timestamptz,
  loss_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'observacao',
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  name text,
  role text,
  device text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Atualizacao segura para bancos ja existentes.
-- O create table if not exists nao adiciona colunas novas em tabelas antigas.
-- Por isso estes ALTER TABLE garantem compatibilidade sem apagar dados.
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists active boolean default true;
alter table public.profiles add column if not exists commission_rate numeric(5,4) default 0.1500;
alter table public.profiles add column if not exists role text default 'vendedor';
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();
update public.profiles set active = true where active is null;
update public.profiles set commission_rate = 0.1500 where commission_rate is null;
update public.profiles set role = 'vendedor' where role is null;
update public.profiles set created_at = now() where created_at is null;
update public.profiles set updated_at = now() where updated_at is null;

alter table public.services add column if not exists category text default 'Sites';
alter table public.services add column if not exists description text;
alter table public.services add column if not exists development_price numeric(12,2) default 0;
alter table public.services add column if not exists setup_integration_price numeric(12,2) default 0;
alter table public.services add column if not exists monthly_price numeric(12,2) default 0;
alter table public.services add column if not exists payment_terms text;
alter table public.services add column if not exists delivery_time text;
alter table public.services add column if not exists sales_arguments text;
alter table public.services add column if not exists active boolean default true;
alter table public.services add column if not exists sort_order integer default 0;
alter table public.services add column if not exists created_at timestamptz default now();
alter table public.services add column if not exists updated_at timestamptz default now();
update public.services set category = 'Sites' where category is null;
update public.services set development_price = 0 where development_price is null;
update public.services set setup_integration_price = 0 where setup_integration_price is null;
update public.services set monthly_price = 0 where monthly_price is null;
update public.services set active = true where active is null;
update public.services set sort_order = 0 where sort_order is null;
update public.services set created_at = now() where created_at is null;
update public.services set updated_at = now() where updated_at is null;

alter table public.leads add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.leads add column if not exists company_name text;
alter table public.leads add column if not exists whatsapp text;
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists origin text default 'WhatsApp';
alter table public.leads add column if not exists proposal_value numeric(12,2) default 0;
alter table public.leads add column if not exists notes text;
alter table public.leads add column if not exists next_contact_at date;
alter table public.leads add column if not exists closed_at timestamptz;
alter table public.leads add column if not exists loss_reason text;
alter table public.leads add column if not exists created_at timestamptz default now();
alter table public.leads add column if not exists updated_at timestamptz default now();
update public.leads set origin = 'WhatsApp' where origin is null;
update public.leads set proposal_value = 0 where proposal_value is null;
update public.leads set created_at = now() where created_at is null;
update public.leads set updated_at = now() where updated_at is null;

create table if not exists public.login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  name text,
  role text,
  device text,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.login_logs add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.login_logs add column if not exists email text;
alter table public.login_logs add column if not exists name text;
alter table public.login_logs add column if not exists role text;
alter table public.login_logs add column if not exists device text;
alter table public.login_logs add column if not exists user_agent text;
alter table public.login_logs add column if not exists created_at timestamptz default now();
update public.login_logs set created_at = now() where created_at is null;

notify pgrst, 'reload schema';


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at before update on public.services for each row execute function public.set_updated_at();

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.login_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_insert_admin on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;

drop policy if exists services_select on public.services;
drop policy if exists services_insert_admin on public.services;
drop policy if exists services_update_admin on public.services;
drop policy if exists services_delete_admin on public.services;

drop policy if exists leads_select on public.leads;
drop policy if exists leads_insert on public.leads;
drop policy if exists leads_update on public.leads;
drop policy if exists leads_delete_admin on public.leads;

drop policy if exists activities_select on public.activities;
drop policy if exists activities_insert on public.activities;
drop policy if exists activities_update_admin on public.activities;
drop policy if exists activities_delete_admin on public.activities;

drop policy if exists login_logs_select_admin on public.login_logs;
drop policy if exists login_logs_insert_self on public.login_logs;
drop policy if exists login_logs_delete_admin on public.login_logs;

create policy profiles_select on public.profiles
for select using (public.is_admin() or id = auth.uid());

create policy profiles_insert_admin on public.profiles
for insert with check (public.is_admin());

create policy profiles_update_admin on public.profiles
for update using (public.is_admin() or id = auth.uid())
with check (public.is_admin() or id = auth.uid());

create policy profiles_delete_admin on public.profiles
for delete using (public.is_admin());

create policy services_select on public.services
for select using (active = true or public.is_admin());

create policy services_insert_admin on public.services
for insert with check (public.is_admin());

create policy services_update_admin on public.services
for update using (public.is_admin()) with check (public.is_admin());

create policy services_delete_admin on public.services
for delete using (public.is_admin());

create policy leads_select on public.leads
for select using (public.is_admin() or vendedor_id = auth.uid());

create policy leads_insert on public.leads
for insert with check (public.is_admin() or vendedor_id = auth.uid());

create policy leads_update on public.leads
for update using (public.is_admin() or vendedor_id = auth.uid())
with check (public.is_admin() or vendedor_id = auth.uid());

create policy leads_delete_admin on public.leads
for delete using (public.is_admin());

create policy activities_select on public.activities
for select using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (select 1 from public.leads l where l.id = activities.lead_id and l.vendedor_id = auth.uid())
);

create policy activities_insert on public.activities
for insert with check (
  public.is_admin()
  or user_id = auth.uid()
  or exists (select 1 from public.leads l where l.id = lead_id and l.vendedor_id = auth.uid())
);

create policy activities_update_admin on public.activities
for update using (public.is_admin()) with check (public.is_admin());

create policy activities_delete_admin on public.activities
for delete using (public.is_admin());


create policy login_logs_select_admin on public.login_logs
for select using (public.is_admin());

create policy login_logs_insert_self on public.login_logs
for insert with check (user_id = auth.uid());

create policy login_logs_delete_admin on public.login_logs
for delete using (public.is_admin());


-- INTEGRACAO WHATSAPP CLOUD API
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  contact_phone text not null,
  contact_name text,
  seller_id uuid references public.profiles(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'novo' check (status in ('novo','em_atendimento','proposta_enviada','negociacao','fechado','perdido')),
  last_message text,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contact_phone)
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','system')),
  sender_profile_id uuid references public.profiles(id) on delete set null,
  sender_name text,
  contact_phone text,
  message text not null,
  meta_message_id text unique,
  meta_status text,
  raw jsonb,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_conversations add column if not exists contact_phone text;
alter table public.whatsapp_conversations add column if not exists contact_name text;
alter table public.whatsapp_conversations add column if not exists seller_id uuid references public.profiles(id) on delete set null;
alter table public.whatsapp_conversations add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.whatsapp_conversations add column if not exists status text default 'novo';
alter table public.whatsapp_conversations add column if not exists last_message text;
alter table public.whatsapp_conversations add column if not exists last_message_at timestamptz;
alter table public.whatsapp_conversations add column if not exists last_inbound_at timestamptz;
alter table public.whatsapp_conversations add column if not exists unread_count integer default 0;
alter table public.whatsapp_conversations add column if not exists created_at timestamptz default now();
alter table public.whatsapp_conversations add column if not exists updated_at timestamptz default now();
update public.whatsapp_conversations set status = 'novo' where status is null;
update public.whatsapp_conversations set unread_count = 0 where unread_count is null;
update public.whatsapp_conversations set created_at = now() where created_at is null;
update public.whatsapp_conversations set updated_at = now() where updated_at is null;

alter table public.whatsapp_messages add column if not exists conversation_id uuid references public.whatsapp_conversations(id) on delete cascade;
alter table public.whatsapp_messages add column if not exists direction text;
alter table public.whatsapp_messages add column if not exists sender_profile_id uuid references public.profiles(id) on delete set null;
alter table public.whatsapp_messages add column if not exists sender_name text;
alter table public.whatsapp_messages add column if not exists contact_phone text;
alter table public.whatsapp_messages add column if not exists message text;
alter table public.whatsapp_messages add column if not exists meta_message_id text;
alter table public.whatsapp_messages add column if not exists meta_status text;
alter table public.whatsapp_messages add column if not exists raw jsonb;
alter table public.whatsapp_messages add column if not exists created_at timestamptz default now();
update public.whatsapp_messages set created_at = now() where created_at is null;

create unique index if not exists whatsapp_conversations_phone_key on public.whatsapp_conversations(contact_phone);
create index if not exists whatsapp_conversations_seller_idx on public.whatsapp_conversations(seller_id);
create index if not exists whatsapp_messages_conversation_idx on public.whatsapp_messages(conversation_id, created_at);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

drop policy if exists whatsapp_conversations_select on public.whatsapp_conversations;
drop policy if exists whatsapp_conversations_insert_admin on public.whatsapp_conversations;
drop policy if exists whatsapp_conversations_update on public.whatsapp_conversations;
drop policy if exists whatsapp_conversations_delete_admin on public.whatsapp_conversations;
drop policy if exists whatsapp_messages_select on public.whatsapp_messages;
drop policy if exists whatsapp_messages_insert on public.whatsapp_messages;
drop policy if exists whatsapp_messages_delete_admin on public.whatsapp_messages;

create policy whatsapp_conversations_select on public.whatsapp_conversations
for select using (public.is_admin() or seller_id = auth.uid());

create policy whatsapp_conversations_insert_admin on public.whatsapp_conversations
for insert with check (public.is_admin());

create policy whatsapp_conversations_update on public.whatsapp_conversations
for update using (public.is_admin() or seller_id = auth.uid())
with check (public.is_admin() or seller_id = auth.uid());

create policy whatsapp_conversations_delete_admin on public.whatsapp_conversations
for delete using (public.is_admin());

create policy whatsapp_messages_select on public.whatsapp_messages
for select using (
  public.is_admin()
  or exists (
    select 1 from public.whatsapp_conversations c
    where c.id = whatsapp_messages.conversation_id
      and c.seller_id = auth.uid()
  )
);

create policy whatsapp_messages_insert on public.whatsapp_messages
for insert with check (
  public.is_admin()
  or exists (
    select 1 from public.whatsapp_conversations c
    where c.id = conversation_id
      and c.seller_id = auth.uid()
  )
);

create policy whatsapp_messages_delete_admin on public.whatsapp_messages
for delete using (public.is_admin());


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_conversations_updated_at on public.whatsapp_conversations;
create trigger trg_whatsapp_conversations_updated_at before update on public.whatsapp_conversations for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

insert into public.services (name, category, description, development_price, setup_integration_price, monthly_price, payment_terms, delivery_time, sales_arguments, active, sort_order)
values
('Site Institucional Profissional', 'Sites', 'Site responsivo com apresentação da empresa, serviços, botão de WhatsApp, formulário e otimização básica para Google.', 1599, 0, 0, '50% para iniciar e 50% na entrega, após aprovação.', '7 a 15 dias úteis', 'Mostra profissionalismo, passa confiança e ajuda o cliente a encontrar a empresa no Google.', true, 1),
('Catálogo Online com Painel', 'Sites', 'Catálogo de produtos, veículos ou serviços com painel para cadastrar e editar itens.', 2499, 0, 0, '50% para iniciar e 50% na entrega, após aprovação.', '15 a 25 dias úteis', 'Ideal para empresas que precisam divulgar produtos e receber contatos pelo WhatsApp.', true, 2),
('Sistema de Gestão Personalizado', 'Sistemas', 'Sistema interno para clientes, estoque, orçamentos, ordens de serviço, financeiro e relatórios.', 3499, 499, 149.90, 'Desenvolvimento conforme escopo. Adesão e integração na implantação. Mensalidade após entrega.', '25 a 45 dias úteis', 'Reduz planilhas, organiza processos e dá controle real da operação.', true, 3),
('CRM Interno para Vendedores', 'Sistemas', 'Sistema para vendedores controlarem leads, propostas, retornos, vendas e comissões.', 2499, 399, 99.90, 'Desenvolvimento + adesão na implantação. Mensalidade para suporte, hospedagem e melhorias.', '15 a 30 dias úteis', 'Ajuda a equipe comercial a não perder clientes e acompanhar tudo por status.', true, 4)
on conflict do nothing;
