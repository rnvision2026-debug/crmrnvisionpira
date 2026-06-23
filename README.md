# RN CRM Vendas — versão NPM/React Clean

Sistema interno para vendedores da RN Vision Pira.

## O que vem pronto

- Login com Supabase Auth.
- Painel Admin e Painel do Vendedor.
- Visual clean branco, organizado e profissional.
- Tela de boas-vindas com a logo RN Vision Pira.
- Cadastro de vendedores direto pelo CRM.
- Criação automática do login do vendedor via Netlify Function.
- Troca de senha do vendedor pelo painel.
- Cadastro de serviços e valores.
- Campos de desenvolvimento, adesão + integração e mensalidade.
- Cadastro de leads/clientes.
- Status comercial.
- Comissões automáticas.
- Bônus por meta.
- Deploy preparado para GitHub + Netlify + Supabase.

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
```

A `SUPABASE_SERVICE_ROLE_KEY` é secreta e deve ficar somente no Netlify. Nunca coloque essa chave no GitHub.

## Supabase

1. Abra `supabase/schema.sql`.
2. Cole no SQL Editor do Supabase e execute.
3. Crie o usuário admin em Authentication > Users:

```txt
admin@rnvision.com.br
123456
```

4. Execute `supabase/admin_setup.sql` no SQL Editor.

## Teste local opcional

```bash
npm install
npm run dev
```

## Build testado

Esta versão foi testada com:

```bash
npm run build
```

