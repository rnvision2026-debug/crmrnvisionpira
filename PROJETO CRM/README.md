# RN CRM Vendas - Negociações Ajustadas

Versão NPM/React para GitHub + Netlify + Supabase.

## Ajustes desta versão

- Página Negociações mais limpa.
- Campo de edição da mensagem automática do WhatsApp fica fechado por padrão.
- Admin abre a edição da mensagem apenas clicando em **Editar mensagem**.
- Admin visualiza o status do atendimento em modo leitura.
- Admin só altera o status depois de clicar em **Editar status**.
- Vendedor continua podendo atualizar o status do próprio atendimento.
- Responsivo e PWA mantidos.

## Netlify

Build command:

```txt
npm run build
```

Publish directory:

```txt
dist
```

Base directory: deixe em branco.

## Não subir no GitHub

```txt
node_modules
dist
.env
package-lock.json
```

## Supabase

Se já rodou a versão anterior, rode `supabase/ATUALIZAR-BANCO.sql` apenas se ainda não tiver as tabelas de negociações/configurações.
