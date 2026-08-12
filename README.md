# Cardápio Online

Plataforma de cardápio digital e pedidos online para restaurantes, com área do cliente (cardápio, carrinho, checkout, acompanhamento de pedido) e painel administrativo para o lojista (produtos, pedidos, estoque e financeiro).

Projeto de aprendizado — desenvolvido em etapas, do zero.

## Loja de exemplo

Durante o desenvolvimento, usamos dados fictícios da **Doralina Vegana** para testar o cardápio, categorias, produtos e complementos.

## Stack planejada

- **Frontend:** HTML/CSS/JavaScript (fundamentos) → React + Vite + TypeScript (aplicação real)
- **Backend:** Node.js + Express + TypeScript
- **Banco de dados:** PostgreSQL (via Docker em desenvolvimento) + Prisma ORM
- **Autenticação:** JWT + bcrypt

## Como rodar

### Backend

```
cd backend
npm install
npm run dev
```

Servidor sobe em `http://localhost:3333`.

## Status

🚧 Em desenvolvimento — Etapa 3 concluída (primeiro servidor Node/Express em TypeScript, veja `backend/`).

## Etapas do projeto

- [x] Etapa 0 — Ambiente e setup do repositório
- [x] Etapa 1 — Cardápio estático em HTML/CSS
- [x] Etapa 2 — Interatividade com JavaScript puro
- [x] Etapa 3 — Primeiro servidor Node/Express
- [ ] Etapa 4 — PostgreSQL + Prisma (modelagem inicial)
- [ ] Etapa 5 — API de produtos (CRUD)
- [ ] Etapa 6 — Migrar cardápio para React (Vite)
- [ ] Etapa 7 — Carrinho e checkout completos
- [ ] Etapa 8 — API de pedidos
- [ ] Etapa 9 — Login do lojista (JWT + bcrypt)
- [ ] Etapa 10 — Painel: CRUD de produtos/categorias
- [ ] Etapa 11 — Painel: gestão de pedidos
- [ ] Etapa 12 — Acompanhamento de status pelo cliente
- [ ] Etapa 13 — Estoque básico
- [ ] Etapa 14 — Dashboard e financeiro básico
- [ ] Etapa 15 — Deploy
