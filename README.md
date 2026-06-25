# RN CRM Vendas — Negociações Simplificadas

Versão NPM/React para GitHub + Netlify + Supabase.

## O que foi ajustado

- Página **Negociações** redesenhada para ficar mais simples e objetiva.
- Admin pode editar a mensagem automática do WhatsApp pelo CRM.
- Mensagem automática com variáveis: `{vendedor}`, `{cliente}`, `{empresa}`, `{servico}`, `{valor}`.
- Vendedor inicia atendimento pelo WhatsApp próprio.
- CRM registra apenas o processo da negociação, sem acessar conversas pessoais.
- Histórico mais organizado por lead.
- Layout responsivo mantido.

## Netlify

Use:

- Build command: `npm run build`
- Publish directory: `dist`
- Base directory: deixe em branco

## Não subir no GitHub

- `node_modules`
- `dist`
- `.env`
- `package-lock.json`

## Variáveis necessárias no Netlify

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Banco de dados

Depois de subir e fazer deploy, rode no Supabase:

`supabase/ATUALIZAR-BANCO.sql`

Esse arquivo cria/atualiza a tabela `app_settings` usada para salvar a mensagem automática do WhatsApp. Não apaga seus dados.
