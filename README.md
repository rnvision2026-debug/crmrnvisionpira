# RN CRM Vendas - Versão pronta para hospedagem estática

Esta versão foi feita para resolver os erros de deploy do Netlify.
Ela NÃO usa npm, React, Vite, package.json, node_modules ou build.

Você pode subir direto na hospedagem como site estático.

## O que vem no sistema

- Login com Supabase Auth
- Tela de boas-vindas com a logo da RN Vision Pira
- Painel Admin
- Painel do Vendedor
- Leads e propostas
- Serviços e valores
- Campo de valor de desenvolvimento/projeto
- Campo de adesão + integração
- Campo de mensalidade
- Comissão automática
- Bônus mensal por desempenho
- Cada vendedor vê apenas os próprios leads
- Admin vê tudo
- Modo demonstração local caso o Supabase ainda não esteja configurado

## Como configurar o Supabase

1. Crie um projeto no Supabase.
2. Vá em SQL Editor > New query.
3. Abra o arquivo `supabase/schema.sql`.
4. Copie tudo, cole no Supabase e clique em Run.
5. Vá em Authentication > Users > Add user.
6. Crie o usuário:

E-mail: admin@rnvision.com.br
Senha: 123456

7. Volte no SQL Editor.
8. Rode o arquivo `supabase/admin_setup.sql`.

Isso transforma o usuário admin@rnvision.com.br em administrador.

## Como conectar o site ao Supabase

Abra o arquivo `config.js` e preencha:

```js
window.RNCRM_CONFIG = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_ANON_KEY: "SUA-CHAVE-ANON-PUBLICA"
};
```

Use apenas a Anon/Public Key. Nunca use service_role no frontend.

## Como subir no Netlify

Esta versão não precisa de build.

No Netlify, configure assim:

Build command: deixar vazio
Publish directory: .
Base directory: deixar vazio

Se estiver usando GitHub, suba todos os arquivos deste projeto na raiz do repositório.
Não precisa package.json.

Se for subir manualmente, arraste a pasta inteira no Netlify Drop.

## Se você já tinha um site no Netlify dando erro

Vá em:

Project configuration > Build & deploy > Build settings

E altere para:

Build command: vazio
Publish directory: .

Depois vá em:

Deploys > Trigger deploy > Clear cache and deploy site

## Como cadastrar vendedores

1. No Supabase, vá em Authentication > Users.
2. Clique em Add user.
3. Crie o e-mail e senha do vendedor.
4. O sistema cria o perfil automaticamente como vendedor.
5. Entre no CRM como admin e ajuste o nome, comissão ou bloqueio.

## Login demo sem Supabase

Se o `config.js` estiver vazio, o sistema entra em modo demonstração:

Admin: admin@rnvision.com.br / 123456
Vendedor: vendedor1@rnvision.com.br / 123456

Os dados demo ficam salvos apenas no navegador.
