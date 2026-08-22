# Cardápio Online

Plataforma de cardápio digital e pedidos online para restaurantes, com área do cliente (cardápio, carrinho, checkout, acompanhamento de pedido) e painel administrativo para o lojista (produtos, pedidos, estoque e financeiro).

Projeto de aprendizado — desenvolvido em etapas, do zero.

## Loja de exemplo

Durante o desenvolvimento, usamos dados fictícios da **Doralina Vegana** para testar o cardápio, categorias, produtos e complementos.

## Stack planejada

- **Frontend:** React + Vite + TypeScript (`frontend/`) — fundamentos em HTML/CSS/JS puro ficam em `fundamentos/`, como registro do aprendizado
- **Backend:** Node.js + Express + TypeScript
- **Banco de dados:** PostgreSQL 16 via Docker (desenvolvimento) / Supabase PostgreSQL (produção) + Prisma ORM
- **Autenticação:** JWT + bcrypt

## Como rodar

### Banco de dados (PostgreSQL via Docker)

```
docker compose up -d
```

Sobe um Postgres 16 em `localhost:5432` (usuário/senha/banco: `cardapio`), com os dados persistidos num volume Docker.

### Backend

```
cd backend
npm install
cp .env.example .env   # ajuste se necessário
npm run db:migrate     # aplica as migrations do Prisma
npm run db:seed        # popular com os dados de exemplo (Doralina Vegana)
npm run dev
```

Servidor sobe em `http://localhost:3333`. Para explorar os dados visualmente, `npm run db:studio` abre o Prisma Studio.

### Frontend

```
cd frontend
npm install
cp .env.example .env   # ajuste se necessário
npm run dev
```

Sobe em `http://localhost:5173`, consumindo a API do backend (`VITE_API_URL`).

## Deploy (Render)

O banco de produção usado pelo backend é o **Supabase PostgreSQL**, via `DATABASE_URL` configurada manualmente (não faz parte do Blueprint). O `render.yaml` na raiz ainda declara 3 recursos como *Blueprint* — banco Postgres do Render, backend (Node) e frontend (site estático) —, mas o Postgres do Render (`cardapio-online-db`) permanece só temporariamente, como rollback da migração para o Supabase, e será removido do Blueprint após o período de validação. Passo a passo:

1. Crie uma conta em [render.com](https://render.com) (ou faça login) e conecte sua conta do GitHub.
2. No dashboard, **New → Blueprint**, selecione o repositório `cardapio-online`. O Render lê o `render.yaml` e mostra os recursos que vai criar: `cardapio-online-db` (rollback, não usado em produção), `cardapio-online-backend`, `cardapio-online-frontend`.
3. No serviço `cardapio-online-backend`, aba **Environment**, configure manualmente a variável secreta `DATABASE_URL` com a connection string do **Supabase Session Pooler** (porta 5432) — ela não vem do `render.yaml` (`sync: false`) justamente para não ficar versionada.
4. Confira e clique em **Apply**. O Render builda o backend (rodando `npx prisma migrate deploy` automaticamente) e o frontend.
5. Depois do primeiro deploy, popule o banco **uma única vez**: no serviço `cardapio-online-backend`, aba **Shell**, rode `npm run db:seed`.
   ⚠️ Não deixe o seed rodando a cada deploy — ele apaga pedidos e produtos existentes antes de recriar os dados de exemplo.
6. Acesse a URL do frontend (algo como `https://cardapio-online-frontend.onrender.com`) e teste o fluxo completo.

**Vale saber:**
- O plano gratuito "dorme" o backend depois de um tempo sem uso — a primeira requisição depois disso demora uns 30-60s pra acordar.
- `JWT_SECRET` é gerado automaticamente pelo Render (`generateValue: true`), diferente do valor usado em desenvolvimento.
- As URLs no `render.yaml` (`cardapio-online-backend.onrender.com`, `cardapio-online-frontend.onrender.com`) assumem que os nomes dos serviços não mudam durante o setup. Se o Render pedir nomes diferentes (já em uso por outra conta, por exemplo), ajuste `CORS_ORIGIN` (no backend) e `VITE_API_URL` (no frontend) nas variáveis de ambiente depois do primeiro deploy.
- Nomes de plano e limites do free tier são da Render e podem mudar — confira no painel deles durante o setup.

## Status

🚧 Em desenvolvimento — Etapa 14 concluída (dashboard financeiro no painel: faturamento, ticket médio, produtos mais vendidos, gráficos).

### Lojista (demo)

Criado pelo seed (`npm run db:seed`), junto com 10 pedidos de exemplo espalhados pelos últimos 14 dias (pra o dashboard já vir com dado real). Login em `http://localhost:5173/painel/login`:

- **Email:** `dona@doralinavegana.com.br`
- **Senha:** `doralina123`

### API de autenticação

| Método | Rota         | Descrição                                                      |
|--------|--------------|-------------------------------------------------------------------|
| POST   | `/auth/login`| Login (email + senha) — retorna um JWT válido por 7 dias          |
| GET    | `/auth/me`   | Retorna o usuário autenticado (protegida, exige `Authorization: Bearer <token>`) |

### API de produtos

Rotas de escrita (POST/PUT/DELETE) exigem `Authorization: Bearer <token>` — só o lojista logado pode alterar o cardápio.

Cada produto tem um `estoque` (inteiro, padrão 0). Ao criar um pedido, o backend decrementa o estoque de cada item dentro de uma transação condicionada a ter saldo suficiente (`estoque >= quantidade`) — isso evita que dois pedidos simultâneos vendam mais do que existe. Um produto com `estoque: 0` aparece como "Esgotado" no cardápio.

| Método | Rota            | Descrição                                              |
|--------|-----------------|---------------------------------------------------------|
| GET    | `/produtos`     | Lista produtos (aceita `?categoriaId=`)                 |
| GET    | `/produtos/:id` | Busca um produto                                         |
| POST   | `/produtos`     | Cria um produto 🔒                                       |
| PUT    | `/produtos/:id` | Atualiza um produto (parcial) 🔒                         |
| DELETE | `/produtos/:id` | Remove um produto 🔒                                     |

### API de categorias

| Método | Rota              | Descrição                                              |
|--------|-------------------|---------------------------------------------------------|
| GET    | `/categorias`     | Lista categorias                                         |
| GET    | `/categorias/:id` | Busca uma categoria                                       |
| POST   | `/categorias`     | Cria uma categoria 🔒                                     |
| PUT    | `/categorias/:id` | Atualiza uma categoria (parcial) 🔒                       |
| DELETE | `/categorias/:id` | Remove uma categoria 🔒 (bloqueado se houver produtos vinculados) |

### API de pedidos

`GET /pedidos/:id` é proposital e permanentemente pública — é o link de acompanhamento que o cliente vai usar pra ver o status do próprio pedido (Etapa 12), sem precisar de login. `GET /pedidos` (a lista completa) já expõe dados de todos os clientes, por isso é protegida.

| Método | Rota                  | Descrição                                                                 |
|--------|-----------------------|-----------------------------------------------------------------------------|
| GET    | `/pedidos`            | Lista pedidos, mais recentes primeiro 🔒                                    |
| GET    | `/pedidos/:id`        | Busca um pedido                                                             |
| POST   | `/pedidos`            | Cria um pedido — preços vêm do banco (snapshot em `itens_pedido`), nunca do cliente |
| PATCH  | `/pedidos/:id/status` | Atualiza o status do pedido 🔒                                              |

### API de dashboard

`GET /dashboard` 🔒 — resumo financeiro e operacional pro painel: faturamento total, ticket médio, contagem de pedidos por status, faturamento por forma de pagamento, top 5 produtos mais vendidos e faturamento diário dos últimos 14 dias (zero-preenchido nos dias sem pedido). Pedidos cancelados contam na contagem por status, mas ficam fora de todo cálculo de faturamento.

## Etapas do projeto

- [x] Etapa 0 — Ambiente e setup do repositório
- [x] Etapa 1 — Cardápio estático em HTML/CSS
- [x] Etapa 2 — Interatividade com JavaScript puro
- [x] Etapa 3 — Primeiro servidor Node/Express
- [x] Etapa 4 — PostgreSQL + Prisma (modelagem inicial)
- [x] Etapa 5 — API de produtos (CRUD)
- [x] Etapa 6 — Migrar cardápio para React (Vite)
- [x] Etapa 7 — Carrinho e checkout completos
- [x] Etapa 8 — API de pedidos
- [x] Etapa 9 — Login do lojista (JWT + bcrypt)
- [x] Etapa 10 — Painel: CRUD de produtos/categorias
- [x] Etapa 11 — Painel: gestão de pedidos
- [x] Etapa 12 — Acompanhamento de status pelo cliente
- [x] Etapa 13 — Estoque básico
- [x] Etapa 14 — Dashboard e financeiro básico
- [ ] Etapa 15 — Deploy
