-- Rode depois de criar o usuário admin em Authentication > Users.
-- Altere o e-mail abaixo caso queira usar outro login admin.

insert into public.profiles (id, name, email, role, active, commission_rate)
select id, 'Rennan Nascimento', email, 'admin', true, 0.1500
from auth.users
where email = 'admin@rnvision.com.br'
on conflict (id) do update set
  name = excluded.name,
  role = 'admin',
  active = true,
  commission_rate = excluded.commission_rate;
