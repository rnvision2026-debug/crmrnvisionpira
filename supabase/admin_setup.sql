-- Depois de criar seu usuário em Authentication > Users, rode este SQL.
-- Troque o e-mail se quiser usar outro login de admin.

update public.profiles
set
  name = 'Rennan Nascimento',
  role = 'admin',
  active = true,
  commission_rate = 0.1500
where email = 'admin@rnvision.com.br';
