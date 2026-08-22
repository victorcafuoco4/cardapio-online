import { Router } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middleware/autenticar.js';

export const pedidosRouter = Router();

const TIPOS_ENTREGA = ['RETIRADA', 'ENTREGA'] as const;
export const FORMAS_PAGAMENTO = ['DINHEIRO', 'CARTAO', 'PIX'] as const;
export const STATUS_PEDIDO = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'] as const;

class EstoqueInsuficienteError extends Error {
  constructor(
    public produtoId: number,
    // Nome do produto no momento do erro. PATCH /:id/status precisa dele pra montar
    // a mensagem: depois que a leitura do pedido passou pra dentro da transação, não
    // sobra referência aos itens no bloco catch. Omitido (como em POST /pedidos), a
    // mensagem cai no id, exatamente como antes.
    public nomeProduto?: string,
  ) {
    super(`estoque insuficiente para o produto ${nomeProduto ?? produtoId}`);
  }
}

// Pedido sumiu entre a validação e a transação, ou nunca existiu. Como a leitura
// agora acontece dentro da transação, o 404 precisa viajar como exceção até o catch.
class PedidoNaoEncontradoError extends Error {}

class ProdutoIndisponivelError extends Error {
  constructor(public produtoId: number) {
    super(`produto indisponível: ${produtoId}`);
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

// Formato de um UUID (qualquer versão) — valida antes de consultar o banco pra
// nunca deixar uma string malformada chegar ao driver como valor de uma coluna
// @db.Uuid, o que geraria um erro de sintaxe do Postgres em vez de "não encontrado".
const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /pedidos/acompanhar/:token — pública de propósito: é o link de acompanhamento
// que o cliente usa pra ver o status do próprio pedido, sem precisar de login.
// Path literal ("acompanhar") em vez de reaproveitar a forma /:id — isso evita
// qualquer ambiguidade de rota com o /:id abaixo, que agora é autenticado.
//
// Nunca logar o token (nem em erro nem em log de acesso): ele é a única credencial
// desse link, e nenhuma linha deste handler o imprime.
pedidosRouter.get('/acompanhar/:token', async (req, res) => {
  const { token } = req.params;
  if (!REGEX_UUID.test(token)) {
    res.status(404).json({ erro: 'pedido não encontrado' });
    return;
  }

  // select explícito: só o que a tela de acompanhamento realmente usa. Diferente
  // de um include, um campo novo adicionado ao Pedido no futuro não vaza aqui
  // por padrão — precisa ser adicionado a esta lista de propósito.
  const pedido = await prisma.pedido.findUnique({
    where: { tokenAcompanhamento: token },
    select: {
      status: true,
      tipoEntrega: true,
      total: true,
      criadoEm: true,
      entregueEm: true,
      itens: {
        select: {
          quantidade: true,
          precoUnitario: true,
          produto: { select: { nome: true } },
        },
      },
    },
  });

  if (!pedido) {
    res.status(404).json({ erro: 'pedido não encontrado' });
    return;
  }

  res.json(pedido);
});

// GET /pedidos/:id — protegida: nada no frontend consulta um pedido individual
// pelo id numérico hoje (o painel usa a listagem completa em GET /pedidos), mas
// mantemos a rota disponível pro lojista autenticado, no mesmo padrão de
// PATCH /:id/status. Não é mais pública — isso fechava um IDOR (id sequencial
// permitia enumerar pedidos e ler dados pessoais de qualquer cliente).
pedidosRouter.get('/:id', autenticar, async (req, res) => {
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
      // Decrementa o estoque de cada item condicionado a disponivel=true e a ter
      // saldo suficiente. Esse where é o que torna a operação atômica: se o
      // lojista desativar o produto ou dois pedidos chegarem ao mesmo tempo pro
      // último item em estoque, só um cenário passa — o outro vê count 0 e cai
      // no erro abaixo.
      for (const item of itensPedidos) {
        const resultado = await tx.produto.updateMany({
          where: { id: item.produtoId, disponivel: true, estoque: { gte: item.quantidade } },
          data: { estoque: { decrement: item.quantidade } },
        });
        if (resultado.count === 0) {
          // O where não bateu — falta de estoque ou o produto foi desativado
          // nesse meio-tempo. Só nesse caminho de erro (raro) uma leitura extra
          // diferencia qual dos dois foi, pra devolver a mensagem certa.
          const produtoAtual = await tx.produto.findUnique({
            where: { id: item.produtoId },
            select: { disponivel: true, estoque: true },
          });
          if (!produtoAtual || !produtoAtual.disponivel) {
            throw new ProdutoIndisponivelError(item.produtoId);
          }
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
    if (erro instanceof ProdutoIndisponivelError) {
      const produto = mapaProdutos.get(erro.produtoId);
      res.status(400).json({ erro: `produto indisponível: "${produto?.nome ?? erro.produtoId}"` });
      return;
    }
    if (erro instanceof EstoqueInsuficienteError) {
      const produto = mapaProdutos.get(erro.produtoId);
      res.status(400).json({ erro: `estoque insuficiente para "${produto?.nome ?? erro.produtoId}"` });
      return;
    }
    throw erro;
  }
});

// PATCH /pedidos/:id/status — protegida: só o lojista autenticado avança o pedido.
// Cancelar devolve o estoque reservado pelo pedido; reativar um pedido cancelado
// reserva o estoque de novo (podendo falhar, se não sobrou saldo suficiente).
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
  const novoStatus = status as (typeof STATUS_PEDIDO)[number];

  try {
    const pedido = await prisma.$transaction(async (tx) => {
      // Trava a linha do pedido ANTES de qualquer leitura que decida movimentação
      // de estoque. É essa trava que torna a transição atômica de ponta a ponta:
      // uma segunda requisição concorrente fica bloqueada aqui até a primeira
      // commitar e, só então, lê o status já atualizado — a decisão de devolver
      // saldo nunca é tomada duas vezes sobre a mesma transição.
      //
      // Antes, esta leitura acontecia fora da transação: dois cancelamentos
      // simultâneos (duplo clique no select, ou duas abas do painel — que
      // recarrega sozinho a cada 15s) liam ambos "RECEBIDO", ambos concluíam
      // "não estava cancelado, vai cancelar" e ambos incrementavam o estoque,
      // inflando o saldo sem venda nenhuma ter sido desfeita.
      //
      // O lock precisa vir de um SELECT ... FOR UPDATE explícito porque findUnique
      // não emite cláusula de bloqueio. Sob READ COMMITTED (o padrão do Postgres,
      // que o Prisma não altera), o findUnique seguinte é um novo statement, com
      // snapshot novo — enxerga o commit de quem passou na frente.
      const travadas = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM pedidos WHERE id = ${id} FOR UPDATE
      `;
      if (travadas.length === 0) {
        throw new PedidoNaoEncontradoError();
      }

      const pedidoAtual = await tx.pedido.findUnique({
        where: { id },
        include: { itens: { include: { produto: true } } },
      });
      if (!pedidoAtual) {
        throw new PedidoNaoEncontradoError();
      }

      const estavaCancelado = pedidoAtual.status === 'CANCELADO';
      const vaiCancelar = novoStatus === 'CANCELADO';

      // entregueEm é a fonte oficial da data de faturamento realizado (usada pelo
      // dashboard): grava ao entrar em ENTREGUE, limpa ao sair — nunca fica com uma
      // data "órfã" presa num pedido que não está mais entregue. Qualquer outra
      // transição (que não envolva entrar/sair de ENTREGUE) não toca no campo.
      let entregueEm = pedidoAtual.entregueEm;
      if (novoStatus === 'ENTREGUE' && pedidoAtual.status !== 'ENTREGUE') {
        entregueEm = new Date();
      } else if (novoStatus !== 'ENTREGUE' && pedidoAtual.status === 'ENTREGUE') {
        entregueEm = null;
      }

      if (!estavaCancelado && vaiCancelar) {
        // Cancelando um pedido ativo: devolve pro estoque o que ele tinha reservado.
        for (const item of pedidoAtual.itens) {
          await tx.produto.update({
            where: { id: item.produtoId },
            data: { estoque: { increment: item.quantidade } },
          });
        }
      } else if (estavaCancelado && !vaiCancelar) {
        // Reativando um pedido cancelado: precisa reservar o estoque de novo,
        // condicionado a ter saldo suficiente (mesma lógica atômica do POST /pedidos).
        for (const item of pedidoAtual.itens) {
          const resultado = await tx.produto.updateMany({
            where: { id: item.produtoId, estoque: { gte: item.quantidade } },
            data: { estoque: { decrement: item.quantidade } },
          });
          if (resultado.count === 0) {
            throw new EstoqueInsuficienteError(item.produtoId, item.produto.nome);
          }
        }
      }

      return tx.pedido.update({
        where: { id },
        data: { status: novoStatus, entregueEm },
        include: { itens: { include: { produto: true } } },
      });
    });

    res.json(pedido);
  } catch (erro) {
    if (erro instanceof PedidoNaoEncontradoError) {
      res.status(404).json({ erro: 'pedido não encontrado' });
      return;
    }
    if (erro instanceof EstoqueInsuficienteError) {
      res.status(400).json({
        erro: `não é possível reativar o pedido: estoque insuficiente para "${erro.nomeProduto ?? erro.produtoId}"`,
      });
      return;
    }
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
      res.status(404).json({ erro: 'pedido não encontrado' });
      return;
    }
    throw erro;
  }
});
