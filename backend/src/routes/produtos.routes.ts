import { Router } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middleware/autenticar.js';

export const produtosRouter = Router();

// GET /produtos — lista todos os produtos, com a categoria incluída.
// Aceita ?categoriaId= pra filtrar por categoria.
produtosRouter.get('/', async (req, res) => {
  const { categoriaId } = req.query;

  if (categoriaId !== undefined && !Number.isInteger(Number(categoriaId))) {
    res.status(400).json({ erro: 'categoriaId deve ser um número inteiro' });
    return;
  }

  const produtos = await prisma.produto.findMany({
    where: categoriaId !== undefined ? { categoriaId: Number(categoriaId) } : undefined,
    include: { categoria: true },
    orderBy: [{ categoriaId: 'asc' }, { ordem: 'asc' }],
  });

  res.json(produtos);
});

// PATCH /produtos/reordenar — recebe a nova ordem completa dos produtos de UMA
// categoria e reescreve ordem de forma densa (0..N-1), tudo numa transação:
// ou a lista inteira aplica, ou nada aplica. Protegida.
//
// Precisa vir antes de qualquer rota "/:id" pra não colidir — mas como não há
// nenhum PATCH "/:id" nesse router, a ordem de declaração não importa aqui;
// o middleware do Express casa por método + caminho, não só por caminho.
produtosRouter.patch('/reordenar', autenticar, async (req, res) => {
  const { categoriaId, ids } = req.body ?? {};

  if (!Number.isInteger(categoriaId)) {
    res.status(400).json({ erro: 'categoriaId deve ser um número inteiro' });
    return;
  }
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id: unknown) => Number.isInteger(id))) {
    res.status(400).json({ erro: 'ids deve ser uma lista não vazia de números inteiros' });
    return;
  }
  const idsUnicos = new Set<number>(ids);
  if (idsUnicos.size !== ids.length) {
    res.status(400).json({ erro: 'ids não pode conter valores duplicados' });
    return;
  }

  const produtosAtuais = await prisma.produto.findMany({
    where: { categoriaId },
    select: { id: true },
  });
  const idsAtuais = new Set(produtosAtuais.map((produto) => produto.id));

  const mesmoConjunto = idsAtuais.size === idsUnicos.size && [...idsAtuais].every((id) => idsUnicos.has(id));
  if (!mesmoConjunto) {
    res.status(400).json({
      erro: 'ids deve conter exatamente todos os produtos da categoria informada, sem faltar, repetir ou incluir produtos de outra categoria',
    });
    return;
  }

  const produtos = await prisma.$transaction(
    (ids as number[]).map((id, indice) =>
      prisma.produto.update({ where: { id }, data: { ordem: indice }, include: { categoria: true } }),
    ),
  );

  res.json(produtos.sort((a, b) => a.ordem - b.ordem));
});

// GET /produtos/:id
produtosRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  const produto = await prisma.produto.findUnique({
    where: { id },
    include: { categoria: true },
  });

  if (!produto) {
    res.status(404).json({ erro: 'produto não encontrado' });
    return;
  }

  res.json(produto);
});

type CorpoProduto = {
  nome?: unknown;
  descricao?: unknown;
  preco?: unknown;
  foto?: unknown;
  categoriaId?: unknown;
  estoque?: unknown;
  disponivel?: unknown;
};

// Valida os campos do corpo da requisição.
// Em modo parcial (PUT), campos ausentes são ignorados; os presentes ainda são validados.
// "ordem" não é aceita aqui de propósito — é inteiramente gerenciada pelo backend
// (posição automática na criação, PATCH /produtos/reordenar pra reordenar).
function validarCamposProduto(corpo: CorpoProduto, { parcial }: { parcial: boolean }): string[] {
  const erros: string[] = [];

  const validarCampo = (
    campo: keyof CorpoProduto,
    valido: (valor: unknown) => boolean,
    mensagem: string,
    { obrigatorio }: { obrigatorio: boolean } = { obrigatorio: true },
  ) => {
    const valor = corpo[campo];
    if (valor === undefined) {
      if (obrigatorio && !parcial) erros.push(`${campo} é obrigatório`);
      return;
    }
    if (!valido(valor)) erros.push(mensagem);
  };

  validarCampo('nome', (v) => typeof v === 'string' && v.trim().length > 0, 'nome deve ser um texto não vazio');
  validarCampo('descricao', (v) => typeof v === 'string' && v.trim().length > 0, 'descricao deve ser um texto não vazio');
  validarCampo('foto', (v) => typeof v === 'string' && v.trim().length > 0, 'foto deve ser um texto não vazio');
  validarCampo('preco', (v) => typeof v === 'number' && v > 0, 'preco deve ser um número maior que zero');
  validarCampo('categoriaId', (v) => Number.isInteger(v), 'categoriaId deve ser um número inteiro');
  // estoque tem valor default no schema, então nunca é obrigatório — só validado se enviado.
  validarCampo(
    'estoque',
    (v) => Number.isInteger(v) && (v as number) >= 0,
    'estoque deve ser um número inteiro maior ou igual a zero',
    { obrigatorio: false },
  );
  // disponivel tem valor default no schema, então nunca é obrigatório — só validado se enviado.
  validarCampo('disponivel', (v) => typeof v === 'boolean', 'disponivel deve ser um booleano', {
    obrigatorio: false,
  });

  return erros;
}

// POST /produtos — protegida: só o lojista autenticado pode criar produtos.
// ordem é sempre automática: o produto novo entra no final da categoria escolhida.
produtosRouter.post('/', autenticar, async (req, res) => {
  const erros = validarCamposProduto(req.body ?? {}, { parcial: false });
  if (erros.length > 0) {
    res.status(400).json({ erros });
    return;
  }

  const { nome, descricao, preco, foto, categoriaId, estoque, disponivel } = req.body;

  const categoria = await prisma.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria) {
    res.status(400).json({ erro: 'categoria não encontrada' });
    return;
  }

  // Estritamente depois do maior "ordem" já existente na categoria — funciona
  // mesmo que a sequência atual não comece em 0 (dados antigos, criados antes
  // desta regra). count() colidiria nesse caso; max+1 nunca colide.
  const maximo = await prisma.produto.aggregate({ where: { categoriaId }, _max: { ordem: true } });
  const ordem = (maximo._max.ordem ?? -1) + 1;

  const produto = await prisma.produto.create({
    data: { nome, descricao, preco, foto, categoriaId, ordem, estoque, disponivel },
    include: { categoria: true },
  });

  res.status(201).json(produto);
});

// PUT /produtos/:id — atualização parcial: só os campos enviados no corpo são alterados.
// Protegida: só o lojista autenticado pode editar produtos.
//
// Quando categoriaId muda: o produto vai pro final da categoria nova, e a
// categoria antiga é recompactada (ordem densa 0..N-1) — tudo numa transação,
// pra nunca deixar nenhuma das duas categorias com ordem inconsistente.
produtosRouter.put('/:id', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  const corpo: CorpoProduto = req.body ?? {};
  const erros = validarCamposProduto(corpo, { parcial: true });
  if (erros.length > 0) {
    res.status(400).json({ erros });
    return;
  }

  if (corpo.categoriaId !== undefined) {
    const categoria = await prisma.categoria.findUnique({ where: { id: corpo.categoriaId as number } });
    if (!categoria) {
      res.status(400).json({ erro: 'categoria não encontrada' });
      return;
    }
  }

  const { nome, descricao, preco, foto, categoriaId, estoque, disponivel } = corpo as {
    nome?: string;
    descricao?: string;
    preco?: number;
    foto?: string;
    categoriaId?: number;
    estoque?: number;
    disponivel?: boolean;
  };

  const produto = await prisma.$transaction(async (tx) => {
    const produtoAtual = await tx.produto.findUnique({ where: { id } });
    if (!produtoAtual) return null;

    const categoriaMudou = categoriaId !== undefined && categoriaId !== produtoAtual.categoriaId;

    const dadosUpdate: Prisma.ProdutoUncheckedUpdateInput = {
      nome,
      descricao,
      preco,
      foto,
      categoriaId,
      estoque,
      disponivel,
    };
    if (categoriaMudou) {
      const maximo = await tx.produto.aggregate({ where: { categoriaId }, _max: { ordem: true } });
      dadosUpdate.ordem = (maximo._max.ordem ?? -1) + 1;
    }

    const atualizado = await tx.produto.update({
      where: { id },
      data: dadosUpdate,
      include: { categoria: true },
    });

    if (categoriaMudou) {
      const restantes = await tx.produto.findMany({
        where: { categoriaId: produtoAtual.categoriaId },
        orderBy: { ordem: 'asc' },
      });
      await Promise.all(
        restantes.map((produtoRestante, indice) =>
          produtoRestante.ordem === indice
            ? Promise.resolve(produtoRestante)
            : tx.produto.update({ where: { id: produtoRestante.id }, data: { ordem: indice } }),
        ),
      );
    }

    return atualizado;
  });

  if (!produto) {
    res.status(404).json({ erro: 'produto não encontrado' });
    return;
  }

  res.json(produto);
});

// DELETE /produtos/:id — protegida: só o lojista autenticado pode remover produtos.
// Recompacta a ordem da categoria de origem depois de remover, na mesma transação.
produtosRouter.delete('/:id', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const produtoRemovido = await tx.produto.delete({ where: { id } });

      const restantes = await tx.produto.findMany({
        where: { categoriaId: produtoRemovido.categoriaId },
        orderBy: { ordem: 'asc' },
      });
      await Promise.all(
        restantes.map((produtoRestante, indice) =>
          produtoRestante.ordem === indice
            ? Promise.resolve(produtoRestante)
            : tx.produto.update({ where: { id: produtoRestante.id }, data: { ordem: indice } }),
        ),
      );
    });
    res.status(204).send();
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      if (erro.code === 'P2025') {
        res.status(404).json({ erro: 'produto não encontrado' });
        return;
      }
      if (erro.code === 'P2003') {
        res.status(400).json({ erro: 'produto possui pedidos vinculados e não pode ser removido' });
        return;
      }
    }
    throw erro;
  }
});
