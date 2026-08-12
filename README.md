# Cardápio Online

Plataforma de cardápio digital e pedidos online para restaurantes, com área do cliente (cardápio, carrinho, checkout, acompanhamento de pedido) e painel administrativo para o lojista (produtos, pedidos, estoque e financeiro).

Projeto de aprendizado — desenvolvido em etapas, do zero.

## Loja de exemplo

Durante o desenvolvimento, usamos dados fictícios da **Doralina Vegana** para testar o cardápio, categorias, produtos e complementos.

## Stack planejada

- **Frontend:** React + Vite + TypeScript (`frontend/`) — fundamentos em HTML/CSS/JS puro ficam em `fundamentos/`, como registro do aprendizado
- **Backend:** Node.js + Express + TypeScript
- **Banco de dados:** PostgreSQL (via Docker em desenvolvimento) + Prisma ORM
- **Autenticação:** JWT + bcrypt

## Como rodar

### Banco de dados (PostgreSQL via Docker)

```
docker compose up -d
```

Sobe um Postgres em `localhost:5432` (usuário/senha/banco: `cardapio`), com os dados persistidos num volume Docker.

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

## Status

🚧 Em desenvolvimento — Etapa 7 concluída (carrinho com checkout completo: dados do cliente, retirada/entrega, forma de pagamento e confirmação — ainda sem persistir no backend, isso é a Etapa 8).

### API de produtos

| Método | Rota            | Descrição                                              |
|--------|-----------------|---------------------------------------------------------|
| GET    | `/produtos`     | Lista produtos (aceita `?categoriaId=`)                 |
| GET    | `/produtos/:id` | Busca um produto                                         |
| POST   | `/produtos`     | Cria um produto                                          |
| PUT    | `/produtos/:id` | Atualiza um produto (parcial: só os campos enviados)     |
| DELETE | `/produtos/:id` | Remove um produto                                         |

## Etapas do projeto

- [x] Etapa 0 — Ambiente e setup do repositório
- [x] Etapa 1 — Cardápio estático em HTML/CSS
- [x] Etapa 2 — Interatividade com JavaScript puro
- [x] Etapa 3 — Primeiro servidor Node/Express
- [x] Etapa 4 — PostgreSQL + Prisma (modelagem inicial)
- [x] Etapa 5 — API de produtos (CRUD)
- [x] Etapa 6 — Migrar cardápio para React (Vite)
- [x] Etapa 7 — Carrinho e checkout completos
- [ ] Etapa 8 — API de pedidos
- [ ] Etapa 9 — Login do lojista (JWT + bcrypt)
- [ ] Etapa 10 — Painel: CRUD de produtos/categorias
- [ ] Etapa 11 — Painel: gestão de pedidos
- [ ] Etapa 12 — Acompanhamento de status pelo cliente
- [ ] Etapa 13 — Estoque básico
- [ ] Etapa 14 — Dashboard e financeiro básico
- [ ] Etapa 15 — Deploy
