# Wish BI

Painel de vendas, produtos e estoque da Wish Fine Jewelry. O frontend usa Next.js 15; a API usa Express e consulta um SQL Server.

## Rodar localmente

1. Instale as dependências com `npm ci`, `npm --prefix backend ci` e `npm --prefix frontend ci`.
2. Copie `.env.example` para `backend/.env` e preencha as variáveis `WISHBI_SQL_*` com as credenciais do ambiente autorizado.
3. Crie `frontend/.env.local` com `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`.
4. Execute `npm run dev`. O painel abre em `http://localhost:3000` e a API em `http://localhost:4000`.

Para verificar o frontend de produção, execute `npm run build`.

## Estrutura

- `frontend/app/(dashboard)`: resumo, vendas, produtos e estoque.
- `frontend/app/lib/api.ts`: consultas do painel e filtros de período.
- `backend/src/server.js`: rotas da API.
- `backend/src/queries.js`: consultas SQL dos relatórios.

## Publicação

O código não contém credenciais. Configure as variáveis de ambiente no serviço de hospedagem e mantenha o acesso ao banco restrito. A API atual consulta dados comerciais reais; antes de expô-la publicamente, implemente autenticação e controle de acesso para o painel e a API.

Os mapeamentos internos, slides da reunião e arquivos locais de configuração ficam fora do repositório público.
