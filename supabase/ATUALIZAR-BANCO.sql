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
