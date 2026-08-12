import { Router } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middleware/autenticar.js';

export const pedidosRouter = Router();

const TIPOS_ENTREGA = ['RETIRADA', 'ENTREGA'] as const;
const FORMAS_PAGAMENTO = ['DINHEIRO', 'CARTAO', 'PIX'] as const;
const STATUS_PEDIDO = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'] as const;

class EstoqueInsuficienteError extends Error {
  constructor(public produtoId: number) {
    super(`estoque insuficiente para o produto ${produtoId}`);
  }
}

// GET /pedidos — lista pedidos, mais recentes primeiro. Protegida: é o painel de
// gestão do lojista, expõe dados de clientes (nome, telefone, endereço).
pedidosRouter.get('/', autenticar, async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    include: { itens: { include: { produto: true } } },
    orderBy: { criadoEm: 'desc' },
  });

  res.json(pedidos);
});

// GET /pedidos/:id — pública de propósito: é o link de acompanhamento que o
// cliente usa pra ver o status do próprio pedido (Etapa 12), sem precisar de login.
pedidosRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { itens: { include: { produto: true } } },
  });

  if (!pedido) {
    res.status(404).json({ erro: 'pedido não encontrado' });
    return;
  }

  res.json(pedido);
});

type ItemPedidoCorpo = {
  produtoId?: unknown;
  quantidade?: unknown;
};

type CorpoPedido = {
  nomeCliente?: unknown;
  telefone?: unknown;
  tipoEntrega?: unknown;
  endereco?: unknown;
  formaPagamento?: unknown;
  trocoPara?: unknown;
  observacoes?: unknown;
  itens?: unknown;
};

// Valida o formato do corpo (tipos e obrigatoriedade); não confere se os produtos existem —
// isso é feito depois, já buscando os preços atuais no banco.
function validarCorpoPedido(corpo: CorpoPedido): string[] {
  const erros: string[] = [];

  if (typeof corpo.nomeCliente !== 'string' || corpo.nomeCliente.trim().length === 0) {
    erros.push('nomeCliente é obrigatório');
  }
  if (typeof corpo.telefone !== 'string' || corpo.telefone.trim().length === 0) {
    erros.push('telefone é obrigatório');
  }
  if (typeof corpo.tipoEntrega !== 'string' || !TIPOS_ENTREGA.includes(corpo.tipoEntrega as (typeof TIPOS_ENTREGA)[number])) {
    erros.push(`tipoEntrega deve ser um de: ${TIPOS_ENTREGA.join(', ')}`);
  } else if (corpo.tipoEntrega === 'ENTREGA' && (typeof corpo.endereco !== 'string' || corpo.endereco.trim().length === 0)) {
    erros.push('endereco é obrigatório quando tipoEntrega é ENTREGA');
  }
  if (
    typeof corpo.formaPagamento !== 'string' ||
    !FORMAS_PAGAMENTO.includes(corpo.formaPagamento as (typeof FORMAS_PAGAMENTO)[number])
  ) {
    erros.push(`formaPagamento deve ser um de: ${FORMAS_PAGAMENTO.join(', ')}`);
  }
  if (corpo.trocoPara !== undefined && (typeof corpo.trocoPara !== 'number' || corpo.trocoPara <= 0)) {
    erros.push('trocoPara deve ser um número maior que zero');
  }
  if (corpo.observacoes !== undefined && typeof corpo.observacoes !== 'string') {
    erros.push('observacoes deve ser um texto');
  }

  if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) {
    erros.push('itens deve ser uma lista com pelo menos um item');
  } else {
    corpo.itens.forEach((item: ItemPedidoCorpo, indice: number) => {
      if (!Number.isInteger(item?.produtoId)) {
        erros.push(`itens[${indice}].produtoId deve ser um número inteiro`);
      }
      if (!Number.isInteger(item?.quantidade) || (item.quantidade as number) <= 0) {
        erros.push(`itens[${indice}].quantidade deve ser um número inteiro maior que zero`);
      }
    });
  }

  return erros;
}

// POST /pedidos
pedidosRouter.post('/', async (req, res) => {
  const corpo: CorpoPedido = req.body ?? {};
  const erros = validarCorpoPedido(corpo);
  if (erros.length > 0) {
    res.status(400).json({ erros });
    return;
  }

  const { nomeCliente, telefone, tipoEntrega, endereco, formaPagamento, trocoPara, observacoes } = corpo as {
    nomeCliente: string;
    telefone: string;
    tipoEntrega: 'RETIRADA' | 'ENTREGA';
    endereco?: string;
    formaPagamento: 'DINHEIRO' | 'CARTAO' | 'PIX';
    trocoPara?: number;
    observacoes?: string;
  };
  const itensPedidos = corpo.itens as { produtoId: number; quantidade: number }[];

  // Nunca confia no preço vindo do cliente: busca os produtos no banco e monta
  // o pedido com os preços atuais, um snapshot que não muda se o produto mudar depois.
  const produtoIds = [...new Set(itensPedidos.map((item) => item.produtoId))];
  const produtos = await prisma.produto.findMany({ where: { id: { in: produtoIds } } });

  const produtosNaoEncontrados = produtoIds.filter((id) => !produtos.some((produto) => produto.id === id));
  if (produtosNaoEncontrados.length > 0) {
    res.status(400).json({ erro: `produtos não encontrados: ${produtosNaoEncontrados.join(', ')}` });
    return;
  }

  const mapaProdutos = new Map(produtos.map((produto) => [produto.id, produto]));
  const total = itensPedidos.reduce(
    (acumulado, item) => acumulado.plus(mapaProdutos.get(item.produtoId)!.preco.times(item.quantidade)),
    new Prisma.Decimal(0),
  );

  try {
    const pedido = await prisma.$transaction(async (tx) => {
      // Decrementa o estoque de cada item condicionado a ter saldo suficiente.
      // Esse where com "estoque >= quantidade" é o que torna a operação atômica:
      // se dois pedidos chegarem ao mesmo tempo pro último item em estoque, só um
      // dos updates afeta uma linha — o outro vê count 0 e cai no erro abaixo.
      for (const item of itensPedidos) {
        const resultado = await tx.produto.updateMany({
          where: { id: item.produtoId, estoque: { gte: item.quantidade } },
          data: { estoque: { decrement: item.quantidade } },
        });
        if (resultado.count === 0) {
          throw new EstoqueInsuficienteError(item.produtoId);
        }
      }

      return tx.pedido.create({
        data: {
          nomeCliente,
          telefone,
          tipoEntrega,
          endereco,
          formaPagamento,
          trocoPara,
          observacoes,
          total,
          itens: {
            create: itensPedidos.map((item) => ({
              produtoId: item.produtoId,
              quantidade: item.quantidade,
              precoUnitario: mapaProdutos.get(item.produtoId)!.preco,
            })),
          },
        },
        include: { itens: { include: { produto: true } } },
      });
    });

    res.status(201).json(pedido);
  } catch (erro) {
    if (erro instanceof EstoqueInsuficienteError) {
      const produto = mapaProdutos.get(erro.produtoId);
      res.status(400).json({ erro: `estoque insuficiente para "${produto?.nome ?? erro.produtoId}"` });
      return;
    }
    throw erro;
  }
});

// PATCH /pedidos/:id/status — protegida: só o lojista autenticado avança o pedido.
pedidosRouter.patch('/:id/status', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  const { status } = req.body ?? {};
  if (typeof status !== 'string' || !STATUS_PEDIDO.includes(status as (typeof STATUS_PEDIDO)[number])) {
    res.status(400).json({ erro: `status deve ser um de: ${STATUS_PEDIDO.join(', ')}` });
    return;
  }

  try {
    const pedido = await prisma.pedido.update({
      where: { id },
      data: { status: status as (typeof STATUS_PEDIDO)[number] },
      include: { itens: { include: { produto: true } } },
    });
    res.json(pedido);
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
      res.status(404).json({ erro: 'pedido não encontrado' });
      return;
    }
    throw erro;
  }
});
