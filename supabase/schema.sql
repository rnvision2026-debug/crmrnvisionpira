-- RN CRM Vendas - Supabase
-- Execute este arquivo em Supabase > SQL Editor > New query > Run

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null unique,
  role text not null default 'seller' check (role in ('admin', 'seller')),
  active boolean not null default true,
  commission_rate numeric(6,4) not null default 0.1500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'Serviço',
  description text,
  development_value numeric(12,2) not null default 0,
  setup_integration_value numeric(12,2) not null default 0,
  monthly_value numeric(12,2) not null default 0,
  delivery_time text,
  payment_terms text,
  sales_pitch text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  client_name text not null,
  company text,
  whatsapp text,
  email text,
  source text,
  status text not null default 'Novo' check (status in ('Novo', 'Em atendimento', 'Proposta enviada', 'Negociação', 'Fechado', 'Perdido')),
  proposal_value numeric(12,2) not null default 0,
  monthly_value numeric(12,2) not null default 0,
  next_follow_up date,
  notes text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'note',
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists leads_seller_id_idx on public.leads(seller_id);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_service_id_idx on public.leads(service_id);
create index if not exists activities_lead_id_idx on public.activities(lead_id);

-- Função para atualizar updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

-- Cria profile automaticamente quando criar usuário em Authentication > Users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'seller',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Função segura para checar admin nas policies
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;

-- Remove policies antigas, caso você rode o SQL mais de uma vez
drop policy if exists profiles_select_policy on public.profiles;
drop policy if exists profiles_update_policy on public.profiles;
drop policy if exists profiles_insert_policy on public.profiles;

drop policy if exists services_select_policy on public.services;
drop policy if exists services_admin_insert_policy on public.services;
drop policy if exists services_admin_update_policy on public.services;
drop policy if exists services_admin_delete_policy on public.services;

drop policy if exists leads_select_policy on public.leads;
drop policy if exists leads_insert_policy on public.leads;
drop policy if exists leads_update_policy on public.leads;
drop policy if exists leads_delete_policy on public.leads;

drop policy if exists activities_select_policy on public.activities;
drop policy if exists activities_insert_policy on public.activities;
drop policy if exists activities_update_policy on public.activities;
drop policy if exists activities_delete_policy on public.activities;

-- Profiles
create policy profiles_select_policy
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update_policy
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy profiles_insert_policy
on public.profiles
for insert
to authenticated
with check (id = auth.uid() or public.is_admin());

-- Services
create policy services_select_policy
on public.services
for select
to authenticated
using (active = true or public.is_admin());

create policy services_admin_insert_policy
on public.services
for insert
to authenticated
with check (public.is_admin());

create policy services_admin_update_policy
on public.services
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy services_admin_delete_policy
on public.services
for delete
to authenticated
using (public.is_admin());

-- Leads
create policy leads_select_policy
on public.leads
for select
to authenticated
using (seller_id = auth.uid() or public.is_admin());

create policy leads_insert_policy
on public.leads
for insert
to authenticated
with check (seller_id = auth.uid() or public.is_admin());

create policy leads_update_policy
on public.leads
for update
to authenticated
using (seller_id = auth.uid() or public.is_admin())
with check (seller_id = auth.uid() or public.is_admin());

create policy leads_delete_policy
on public.leads
for delete
to authenticated
using (public.is_admin());

-- Activities
create policy activities_select_policy
on public.activities
for select
to authenticated
using (
  seller_id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.leads l where l.id = activities.lead_id and l.seller_id = auth.uid())
);

create policy activities_insert_policy
on public.activities
for insert
to authenticated
with check (seller_id = auth.uid() or public.is_admin());

create policy activities_update_policy
on public.activities
for update
to authenticated
using (seller_id = auth.uid() or public.is_admin())
with check (seller_id = auth.uid() or public.is_admin());

create policy activities_delete_policy
on public.activities
for delete
to authenticated
using (seller_id = auth.uid() or public.is_admin());

-- Serviços iniciais
insert into public.services (name, category, description, development_value, setup_integration_value, monthly_value, delivery_time, payment_terms, sales_pitch, active)
select 'Site Profissional', 'Sites', 'Site institucional moderno, responsivo, com WhatsApp integrado, formulário e otimização básica para Google.', 1599.00, 0.00, 0.00, '7 a 12 dias úteis', '50% para iniciar e 50% na entrega', 'Ideal para empresas que querem passar mais profissionalismo, credibilidade e receber contatos pelo WhatsApp.', true
where not exists (select 1 from public.services where name = 'Site Profissional');

insert into public.services (name, category, description, development_value, setup_integration_value, monthly_value, delivery_time, payment_terms, sales_pitch, active)
select 'Sistema Personalizado', 'Sistemas', 'Sistema web sob medida para gestão, processos internos, relatórios, usuários e controle por empresa.', 2499.00, 399.00, 149.90, '15 a 30 dias úteis', 'Desenvolvimento + adesão/integração + mensalidade', 'Para empresas que querem sair das planilhas e organizar o atendimento, financeiro, estoque ou processos internos.', true
where not exists (select 1 from public.services where name = 'Sistema Personalizado');

insert into public.services (name, category, description, development_value, setup_integration_value, monthly_value, delivery_time, payment_terms, sales_pitch, active)
select 'CRM Interno de Vendas', 'CRM', 'Sistema para controlar vendedores, leads, propostas, comissões, bônus e acompanhamento comercial.', 0.00, 299.00, 99.90, '3 a 7 dias úteis', 'Adesão + mensalidade', 'Ajuda a empresa a não perder clientes, acompanhar cada vendedor e medir propostas e vendas fechadas.', true
where not exists (select 1 from public.services where name = 'CRM Interno de Vendas');

insert into public.services (name, category, description, development_value, setup_integration_value, monthly_value, delivery_time, payment_terms, sales_pitch, active)
select 'RN Delivery', 'Delivery', 'Cardápio online com pedidos, painel para restaurante, formas de pagamento e organização por WhatsApp.', 0.00, 299.00, 59.90, '3 a 7 dias úteis', 'Adesão + mensalidade', 'Transforma o cardápio do restaurante em um canal de vendas online simples e profissional.', true
where not exists (select 1 from public.services where name = 'RN Delivery');

insert into public.services (name, category, description, development_value, setup_integration_value, monthly_value, delivery_time, payment_terms, sales_pitch, active)
select 'Catálogo com Painel', 'Catálogos', 'Catálogo online com painel administrativo para cadastrar produtos, veículos, fotos, descrições e botão de WhatsApp.', 2499.00, 0.00, 99.90, '10 a 20 dias úteis', '50% para iniciar e 50% na entrega + mensalidade quando houver painel', 'Perfeito para lojas, veículos e empresas que precisam atualizar produtos sem depender do desenvolvedor.', true
where not exists (select 1 from public.services where name = 'Catálogo com Painel');
