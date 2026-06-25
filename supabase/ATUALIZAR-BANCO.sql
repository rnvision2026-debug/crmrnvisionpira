-- CORRECAO RN CRM VENDAS
-- Rode este arquivo no Supabase em: SQL Editor > New query > Run
-- Ele atualiza tabelas antigas sem apagar seus dados.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists active boolean;
alter table public.profiles alter column active set default true;
update public.profiles set active = true where active is null;
alter table public.profiles add column if not exists commission_rate numeric(5,4);
alter table public.profiles alter column commission_rate set default 0.1500;
update public.profiles set commission_rate = 0.1500 where commission_rate is null;
alter table public.profiles add column if not exists role text;
alter table public.profiles alter column role set default 'vendedor';
update public.profiles set role = 'vendedor' where role is null;
alter table public.profiles add column if not exists created_at timestamptz;
alter table public.profiles alter column created_at set default now();
update public.profiles set created_at = now() where created_at is null;
alter table public.profiles add column if not exists updated_at timestamptz;
alter table public.profiles alter column updated_at set default now();
update public.profiles set updated_at = now() where updated_at is null;

alter table public.services add column if not exists category text;
alter table public.services alter column category set default 'Sites';
update public.services set category = 'Sites' where category is null;
alter table public.services add column if not exists description text;
alter table public.services add column if not exists development_price numeric(12,2);
alter table public.services alter column development_price set default 0;
update public.services set development_price = 0 where development_price is null;
alter table public.services add column if not exists setup_integration_price numeric(12,2);
alter table public.services alter column setup_integration_price set default 0;
update public.services set setup_integration_price = 0 where setup_integration_price is null;
alter table public.services add column if not exists monthly_price numeric(12,2);
alter table public.services alter column monthly_price set default 0;
update public.services set monthly_price = 0 where monthly_price is null;
alter table public.services add column if not exists payment_terms text;
alter table public.services add column if not exists delivery_time text;
alter table public.services add column if not exists sales_arguments text;
alter table public.services add column if not exists active boolean;
alter table public.services alter column active set default true;
update public.services set active = true where active is null;
alter table public.services add column if not exists sort_order integer;
alter table public.services alter column sort_order set default 0;
update public.services set sort_order = 0 where sort_order is null;
alter table public.services add column if not exists created_at timestamptz;
alter table public.services alter column created_at set default now();
update public.services set created_at = now() where created_at is null;
alter table public.services add column if not exists updated_at timestamptz;
alter table public.services alter column updated_at set default now();
update public.services set updated_at = now() where updated_at is null;

alter table public.leads add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.leads add column if not exists company_name text;
alter table public.leads add column if not exists whatsapp text;
alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists origin text;
alter table public.leads alter column origin set default 'WhatsApp';
update public.leads set origin = 'WhatsApp' where origin is null;
alter table public.leads add column if not exists proposal_value numeric(12,2);
alter table public.leads alter column proposal_value set default 0;
update public.leads set proposal_value = 0 where proposal_value is null;
alter table public.leads add column if not exists notes text;
alter table public.leads add column if not exists next_contact_at date;
alter table public.leads add column if not exists closed_at timestamptz;
alter table public.leads add column if not exists loss_reason text;
alter table public.leads add column if not exists created_at timestamptz;
alter table public.leads alter column created_at set default now();
update public.leads set created_at = now() where created_at is null;
alter table public.leads add column if not exists updated_at timestamptz;
alter table public.leads alter column updated_at set default now();
update public.leads set updated_at = now() where updated_at is null;

-- Recarrega o cache de schema usado pela API do Supabase/PostgREST.
notify pgrst, 'reload schema';

-- Permissoes para status/exclusao de leads
-- Vendedor pode alterar o status e dados dos proprios leads.
-- Admin pode editar e excluir qualquer lead.
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

alter table public.leads enable row level security;

drop policy if exists leads_select on public.leads;
drop policy if exists leads_insert on public.leads;
drop policy if exists leads_update on public.leads;
drop policy if exists leads_delete_admin on public.leads;

create policy leads_select on public.leads
for select using (public.is_admin() or vendedor_id = auth.uid());

create policy leads_insert on public.leads
for insert with check (public.is_admin() or vendedor_id = auth.uid());

create policy leads_update on public.leads
for update using (public.is_admin() or vendedor_id = auth.uid())
with check (public.is_admin() or vendedor_id = auth.uid());

create policy leads_delete_admin on public.leads
for delete using (public.is_admin());

notify pgrst, 'reload schema';


-- Registros de login dos vendedores
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

alter table public.login_logs enable row level security;

drop policy if exists login_logs_select_admin on public.login_logs;
drop policy if exists login_logs_insert_self on public.login_logs;
drop policy if exists login_logs_delete_admin on public.login_logs;

create policy login_logs_select_admin on public.login_logs
for select using (public.is_admin());

create policy login_logs_insert_self on public.login_logs
for insert with check (user_id = auth.uid());

create policy login_logs_delete_admin on public.login_logs
for delete using (public.is_admin());

notify pgrst, 'reload schema';


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
