import { Router } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middleware/autenticar.js';
import { FORMAS_PAGAMENTO, STATUS_PEDIDO } from './pedidos.routes.js';

export const dashboardRouter = Router();

const DIAS_HISTORICO = 14;

// GET /dashboard — resumo financeiro e operacional pro painel do lojista.
// Totais (faturamento, ticket médio, produtos mais vendidos) são "de sempre";
// o gráfico de faturamento por dia cobre só os últimos 14 dias, com zero
// preenchido nos dias sem pedido, pra o gráfico não ter buracos.
dashboardRouter.get('/', autenticar, async (req, res) => {
  const desde = new Date();
  desde.setDate(desde.getDate() - (DIAS_HISTORICO - 1));
  desde.setHours(0, 0, 0, 0);

  const [contagemPorStatus, pedidos] = await Promise.all([
    prisma.pedido.groupBy({ by: ['status'], _count: true }),
    // Pedidos cancelados não contam como faturamento, por isso ficam de fora daqui.
    prisma.pedido.findMany({
      where: { status: { not: 'CANCELADO' } },
      include: { itens: { include: { produto: true } } },
    }),
  ]);

  const pedidosPorStatus = Object.fromEntries(STATUS_PEDIDO.map((status) => [status, 0])) as Record<
    (typeof STATUS_PEDIDO)[number],
    number
  >;
  for (const grupo of contagemPorStatus) {
    pedidosPorStatus[grupo.status] = grupo._count;
  }

  const totalPedidos = pedidos.length;
  const faturamentoTotal = pedidos.reduce((acumulado, pedido) => acumulado.plus(pedido.total), new Prisma.Decimal(0));
  const ticketMedio = totalPedidos > 0 ? faturamentoTotal.dividedBy(totalPedidos) : new Prisma.Decimal(0);

  const faturamentoPorFormaPagamento = Object.fromEntries(
    FORMAS_PAGAMENTO.map((forma) => [forma, new Prisma.Decimal(0)]),
  ) as Record<(typeof FORMAS_PAGAMENTO)[number], Prisma.Decimal>;
  for (const pedido of pedidos) {
    faturamentoPorFormaPagamento[pedido.formaPagamento] = faturamentoPorFormaPagamento[pedido.formaPagamento].plus(
      pedido.total,
    );
  }

  const vendasPorProduto = new Map<number, { nome: string; quantidade: number; receita: Prisma.Decimal }>();
  for (const pedido of pedidos) {
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
    const dia = new Date(desde);
    dia.setDate(dia.getDate() + i);
    faturamentoPorDiaMapa.set(dia.toISOString().slice(0, 10), new Prisma.Decimal(0));
  }
  for (const pedido of pedidos) {
    const chave = pedido.criadoEm.toISOString().slice(0, 10);
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
