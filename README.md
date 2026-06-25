# RN CRM Vendas — NPM/React + Supabase + Netlify

Sistema interno de vendas da RN Vision Pira com visual clean, responsivo, PWA, login Supabase, cadastro de vendedores direto no CRM e acompanhamento de negociações iniciadas pelo WhatsApp do vendedor.

## O que tem nesta versão

- Login com Supabase Auth.
- Painel Admin e Painel Vendedor.
- Cadastro de vendedores direto no CRM.
- Troca de senha do vendedor pelo admin.
- Cadastro de serviços e valores.
- Leads/clientes.
- Status do lead.
- Comissão e bônus por meta.
- Registros de login dos vendedores.
- Página **Negociações**.
- Botão **Iniciar WhatsApp** usando o WhatsApp do vendedor.
- Linha do tempo do processo comercial.
- Registro de resumo da conversa, objeção, proposta e retorno.
- Admin acompanha somente os registros feitos no CRM, sem acessar conversas pessoais do WhatsApp do vendedor.
- PWA para instalar como aplicativo no computador/celular.

## Como subir no GitHub

Suba todos os arquivos desta pasta, exceto:

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

## Configuração do Netlify

```txt
Base directory: deixar em branco
Build command: npm run build
Publish directory: dist
```

## Variáveis no Netlify

Coloque em **Project configuration > Environment variables**:

```env
VITE_SUPABASE_URL=https://isqiekclfdvekfwblhds.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PvFYSb8eHJdWQyniCYpOiw_CPFHVOOD
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE_DO_SUPABASE
```

A `SUPABASE_SERVICE_ROLE_KEY` é secreta. Ela fica somente no Netlify e nunca deve ir para o GitHub.

## Supabase

Se for projeto novo, rode:

```txt
supabase/schema.sql
```

Se já existe o banco, rode:

```txt
supabase/ATUALIZAR-BANCO.sql
```

Esse arquivo cria/atualiza a tabela `activities`, usada pela linha do tempo das negociações, sem apagar seus dados.

## Fluxo de negociação pelo WhatsApp do vendedor

1. O vendedor cadastra ou abre um lead.
2. Vai em **Negociações**.
3. Seleciona o lead.
4. Clica em **Iniciar WhatsApp**.
5. O CRM abre o WhatsApp do vendedor com mensagem pronta.
6. O CRM registra que o atendimento foi iniciado.
7. O vendedor registra no CRM os resumos, objeções, propostas e retornos.
8. O admin acompanha o processo comercial pela linha do tempo.

Essa versão não conecta no WhatsApp pessoal do vendedor e não lê conversas privadas. Ela registra apenas o processo comercial que o vendedor informar dentro do CRM.
