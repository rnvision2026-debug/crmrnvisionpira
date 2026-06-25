# RN CRM Vendas — NPM/React + Supabase + Netlify + WhatsApp

Sistema interno de vendas da RN Vision Pira com visual clean, responsivo, PWA, login Supabase, cadastro de vendedores direto no CRM e central de atendimentos WhatsApp.

## O que vem pronto

- Login com Supabase Auth.
- Painel Admin e Painel do Vendedor.
- Cadastro de vendedores direto no CRM via Netlify Function.
- Troca de senha de vendedor pelo admin.
- Cadastro de serviços e valores.
- Leads/clientes com status comercial.
- Comissões e bônus por meta.
- Registros de login dos vendedores.
- Menu responsivo e PWA com ícone.
- Página **Atendimentos WhatsApp**.
- Webhook para receber mensagens do WhatsApp Cloud API.
- Envio de mensagens pelo CRM com identificação do vendedor.
- Admin pode atribuir atendimento a vendedor.
- Vendedor vê e responde apenas seus atendimentos.

## Como subir no GitHub

Suba os arquivos da pasta do projeto, mas não suba:

```txt
node_modules
dist
.env
package-lock.json
```

Pode subir:

```txt
src
public
supabase
netlify
package.json
index.html
vite.config.js
netlify.toml
.npmrc
.env.example
README.md
INSTRUCOES-RAPIDAS.txt
```

## Configuração no Netlify

Use:

```txt
Base directory: deixe em branco
Build command: npm run build
Publish directory: dist
```

## Variáveis no Netlify

Em **Project configuration > Environment variables**, cadastre:

```env
VITE_SUPABASE_URL=https://isqiekclfdvekfwblhds.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PvFYSb8eHJdWQyniCYpOiw_CPFHVOOD
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_DO_SUPABASE
WHATSAPP_ACCESS_TOKEN=TOKEN_PERMANENTE_DA_META
WHATSAPP_PHONE_NUMBER_ID=PHONE_NUMBER_ID_DA_META
WHATSAPP_VERIFY_TOKEN=UM_TOKEN_CRIADO_POR_VOCE
WHATSAPP_GRAPH_VERSION=v20.0
```

A `SUPABASE_SERVICE_ROLE_KEY` e `WHATSAPP_ACCESS_TOKEN` são secretas e devem ficar somente no Netlify. Nunca coloque essas chaves no GitHub.

## Supabase

1. Abra `supabase/schema.sql`.
2. Cole no SQL Editor do Supabase e execute.
3. Crie o usuário admin em Authentication > Users:

```txt
admin@rnvision.com.br
123456
```

4. Execute `supabase/admin_setup.sql` no SQL Editor.

Se você já tinha o banco criado, rode também:

```txt
supabase/ATUALIZAR-BANCO.sql
```

Esse arquivo atualiza o banco sem apagar dados.

## Webhook do WhatsApp Cloud API

Depois do deploy publicado, use esta URL na Meta:

```txt
https://SEU-SITE.netlify.app/.netlify/functions/whatsapp-webhook
```

No campo **Verify token**, use exatamente o mesmo valor da variável:

```txt
WHATSAPP_VERIFY_TOKEN
```

Depois assine o evento **messages** no webhook da Meta.

## Teste local opcional

```bash
npm install
npm run dev
```

## Build testado

```bash
npm run build
```
