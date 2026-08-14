import { Router } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { chaveDiaFuso, limitesDoDia } from '../lib/data.js';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middleware/autenticar.js';
import { FORMAS_PAGAMENTO, STATUS_PEDIDO } from './pedidos.routes.js';

export const dashboardRouter = Router();

const DIAS_HISTORICO = 14;

// GET /dashboard — resumo financeiro e operacional pro painel do lojista.
//
// Regra financeira: só pedido ENTREGUE é faturamento realizado. RECEBIDO,
// EM_PREPARO e PRONTO são vendas em andamento (aparecem em "Pedidos em
// aberto", não em nenhuma métrica de faturamento). CANCELADO nunca conta.
// "Hoje" é sempre o dia civil em America/Sao_Paulo (ver lib/data.ts), não o
// fuso do processo Node — importante porque em produção o servidor pode não
// estar rodando com esse fuso.
dashboardRouter.get('/', autenticar, async (req, res) => {
  const agora = new Date();
  const { inicio: inicioHoje, fim: fimHoje } = limitesDoDia(agora);
  const desde = new Date(inicioHoje.getTime() - (DIAS_HISTORICO - 1) * 24 * 60 * 60 * 1000);

  const [totalPedidos, contagemPorStatus, pedidosEntregues, vendasHoje] = await Promise.all([
    prisma.pedido.count({ where: { status: { not: 'CANCELADO' } } }),
    prisma.pedido.groupBy({ by: ['status'], _count: true }),
    // Faturamento (total, por forma de pagamento, produtos mais vendidos, por dia)
    // só considera pedidos ENTREGUE — é a única fonte de "faturamento realizado".
    prisma.pedido.findMany({
      where: { status: 'ENTREGUE' },
      include: { itens: { include: { produto: true } } },
    }),
    prisma.pedido.count({
      where: { criadoEm: { gte: inicioHoje, lt: fimHoje }, status: { not: 'CANCELADO' } },
    }),
  ]);

  const pedidosPorStatus = Object.fromEntries(STATUS_PEDIDO.map((status) => [status, 0])) as Record<
    (typeof STATUS_PEDIDO)[number],
    number
  >;
  for (const grupo of contagemPorStatus) {
    pedidosPorStatus[grupo.status] = grupo._count;
  }
  const pedidosEmAberto = pedidosPorStatus.RECEBIDO + pedidosPorStatus.EM_PREPARO + pedidosPorStatus.PRONTO;

  const faturamentoTotal = pedidosEntregues.reduce(
    (acumulado, pedido) => acumulado.plus(pedido.total),
    new Prisma.Decimal(0),
  );
  const ticketMedio =
    pedidosEntregues.length > 0 ? faturamentoTotal.dividedBy(pedidosEntregues.length) : new Prisma.Decimal(0);

  // entregueEm pode ser null nos pedidos ENTREGUE anteriores à existência do
  // campo (dados legados, ainda sem backfill) — entram no faturamento total,
  // mas ficam de fora de "hoje" e do gráfico por dia, que dependem da data.
  const entreguesHoje = pedidosEntregues.filter(
    (pedido) => pedido.entregueEm !== null && pedido.entregueEm >= inicioHoje && pedido.entregueEm < fimHoje,
  );
  const faturamentoHoje = entreguesHoje.reduce((acumulado, pedido) => acumulado.plus(pedido.total), new Prisma.Decimal(0));
  const ticketMedioHoje =
    entreguesHoje.length > 0 ? faturamentoHoje.dividedBy(entreguesHoje.length) : new Prisma.Decimal(0);

  const faturamentoPorFormaPagamento = Object.fromEntries(
    FORMAS_PAGAMENTO.map((forma) => [forma, new Prisma.Decimal(0)]),
  ) as Record<(typeof FORMAS_PAGAMENTO)[number], Prisma.Decimal>;
  for (const pedido of pedidosEntregues) {
    faturamentoPorFormaPagamento[pedido.formaPagamento] = faturamentoPorFormaPagamento[pedido.formaPagamento].plus(
      pedido.total,
    );
  }

  const vendasPorProduto = new Map<number, { nome: string; quantidade: number; receita: Prisma.Decimal }>();
  for (const pedido of pedidosEntregues) {
    for (const item of pedido.itens) {
      const receitaItem = item.precoUnitario.times(item.quantidade);
      const existente = vendasPorProduto.get(item.produtoId);
      if (existente) {
        existente.quantidade += item.quantidade;
        existente.receita = existente.receita.plus(receitaItem);
      } else {
        vendasPorProduto.set(item.produtoId, {
          nome: item.produto.nome,
          quantidade: item.quantidade,
          receita: receitaItem,
        });
      }
    }
  }
  const produtosMaisVendidos = [...vendasPorProduto.values()]
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)
    .map((produto) => ({ nome: produto.nome, quantidade: produto.quantidade, receita: produto.receita.toFixed(2) }));

  const faturamentoPorDiaMapa = new Map<string, Prisma.Decimal>();
  for (let i = 0; i < DIAS_HISTORICO; i++) {
    const dia = new Date(desde.getTime() + i * 24 * 60 * 60 * 1000);
    faturamentoPorDiaMapa.set(chaveDiaFuso(dia), new Prisma.Decimal(0));
  }
  for (const pedido of pedidosEntregues) {
    if (!pedido.entregueEm) continue;
    const chave = chaveDiaFuso(pedido.entregueEm);
    const valorAtual = faturamentoPorDiaMapa.get(chave);
    if (valorAtual) {
      faturamentoPorDiaMapa.set(chave, valorAtual.plus(pedido.total));
    }
  }
  const faturamentoPorDia = [...faturamentoPorDiaMapa.entries()].map(([data, total]) => ({
    data,
    total: total.toFixed(2),
  }));

  res.json({
    vendasHoje,
    faturamentoHoje: faturamentoHoje.toFixed(2),
    pedidosEmAberto,
    ticketMedioHoje: ticketMedioHoje.toFixed(2),
    totalPedidos,
    faturamentoTotal: faturamentoTotal.toFixed(2),
    ticketMedio: ticketMedio.toFixed(2),
    pedidosPorStatus,
    faturamentoPorFormaPagamento: Object.fromEntries(
      Object.entries(faturamentoPorFormaPagamento).map(([forma, valor]) => [forma, valor.toFixed(2)]),
    ),
    produtosMaisVendidos,
    faturamentoPorDia,
  });
});
