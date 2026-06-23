# RN CRM Vendas — versão NPM/React Clean Corrigida

Sistema interno para vendedores da RN Vision Pira.

## O que vem pronto

- Login com Supabase Auth.
- Painel Admin e Painel do Vendedor.
- Visual clean branco, organizado e profissional.
- Tela de boas-vindas com a logo RN Vision Pira.
- Cadastro de vendedores direto pelo CRM.
- Criação automática do login do vendedor via Netlify Function corrigida, sem erro de WebSocket no Node 20.
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



## Correção incluída nesta versão

Esta versão remove o uso do cliente Supabase JS dentro das Netlify Functions e usa chamadas seguras via API do Supabase no servidor. Isso corrige o erro:

```txt
Node.js 20 detected without native WebSocket support
```

O frontend continua usando Supabase normalmente para login e dados. A chave `SUPABASE_SERVICE_ROLE_KEY` continua protegida somente no Netlify.

## Atualização incluída

- Vendedor pode alterar o status dos próprios leads diretamente na tabela.
- Admin pode excluir leads pelo botão **Excluir lead**.
- O arquivo `supabase/ATUALIZAR-BANCO.sql` reforça as permissões no banco sem apagar dados.

## Atualização de responsividade e PWA

Esta versão também corrige:

- Menu lateral no celular/tablet agora fica fechado e abre pelo botão ☰.
- Menu fecha automaticamente ao escolher uma página.
- Fundo escuro ao abrir o menu no mobile.
- Campos, cards e tabelas mais compactos para não ficarem grandes demais.
- Layout melhorado para telas pequenas, notebooks e desktop.
- PWA configurado com `manifest.webmanifest`, `sw.js` e ícones.
- Ao instalar pelo navegador, o sistema abre em modo aplicativo quando suportado pelo Chrome/Edge.
- Ícone do RN CRM incluído para instalação.

Para o modo aplicativo funcionar, suba no Netlify, abra o site pelo Chrome ou Edge e use a opção **Instalar app** ou **Adicionar à tela inicial**. Se abrir como navegador, remova a instalação antiga e instale novamente após o novo deploy publicado.
