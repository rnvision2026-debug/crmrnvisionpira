# RN CRM Vendas — versão NPM profissional

Sistema interno da RN Vision Pira para vendedores, com React + Vite + Supabase + Netlify Functions.

## O que esta versão faz

- Login real pelo Supabase Auth.
- Tela de boas-vindas com a logo RN Vision Pira após login.
- Dashboard do admin e vendedor.
- Cadastro de vendedores direto no CRM.
- Criação automática do login do vendedor no Supabase Auth via Netlify Function.
- Troca de senha de vendedor direto no CRM.
- Cadastro de serviços e valores.
- Campos de valores:
  - Valor de desenvolvimento/projeto.
  - Valor de adesão + integração.
  - Valor de mensalidade.
- Cadastro de leads/clientes.
- Status de atendimento.
- Copiar mensagem de proposta.
- Abrir WhatsApp do lead.
- Comissão automática por vendedor.
- Bônus mensal por meta.
- Regras de segurança no Supabase.

## Arquivos que devem ir para o GitHub

Suba tudo da pasta, exceto:

```txt
node_modules
dist
.env
package-lock.json
```

Esta versão tem `package.json`, mas **não tem package-lock.json** para evitar o erro de registry que você teve no Netlify.

## Configuração no Netlify

Build command:

```txt
npm run build
```

Publish directory:

```txt
dist
```

Base directory:

```txt
vazio
```

## Variáveis do Netlify

Em `Site configuration > Environment variables`, cadastre:

```env
VITE_SUPABASE_URL=https://isqiekclfdvekfwblhds.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PvFYSb8eHJdWQyniCYpOiw_CPFHVOOD
SUPABASE_SERVICE_ROLE_KEY=cole_a_service_role_key_aqui
```

A `SUPABASE_SERVICE_ROLE_KEY` é obrigatória para cadastrar vendedores direto pelo CRM.
Ela fica somente no Netlify. Não coloque essa chave no GitHub.

## Supabase

1. Entre no projeto do Supabase.
2. Vá em `SQL Editor > New query`.
3. Execute o arquivo:

```txt
supabase/schema.sql
```

4. Vá em `Authentication > Users > Add user`.
5. Crie:

```txt
admin@rnvision.com.br
123456
```

6. Volte no SQL Editor e execute:

```txt
supabase/admin_setup.sql
```

Depois disso, o admin já consegue logar e cadastrar vendedores diretamente pela plataforma.

## Onde pegar a service role key

Supabase > Project Settings > API Keys.

Copie a chave `service_role` ou `secret` do projeto e coloque no Netlify como:

```txt
SUPABASE_SERVICE_ROLE_KEY
```

Nunca coloque essa chave no código ou no GitHub.

## Como testar localmente

Crie um arquivo `.env` copiando o `.env.example` e rode:

```bash
npm install
npm run dev
```

Para testar o cadastro de vendedor localmente, as funções do Netlify precisam rodar pelo Netlify CLI. No Netlify online funciona direto.
