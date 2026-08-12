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
  ordem?: unknown;
};

// Valida os campos do corpo da requisição.
// Em modo parcial (PUT), campos ausentes são ignorados; os presentes ainda são validados.
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
  // ordem tem valor default no schema, então nunca é obrigatório — só validado se enviado.
  validarCampo('ordem', (v) => Number.isInteger(v), 'ordem deve ser um número inteiro', { obrigatorio: false });

  return erros;
}

// POST /produtos — protegida: só o lojista autenticado pode criar produtos.
produtosRouter.post('/', autenticar, async (req, res) => {
  const erros = validarCamposProduto(req.body ?? {}, { parcial: false });
  if (erros.length > 0) {
    res.status(400).json({ erros });
    return;
  }

  const { nome, descricao, preco, foto, categoriaId, ordem } = req.body;

  const categoria = await prisma.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria) {
    res.status(400).json({ erro: 'categoria não encontrada' });
    return;
  }

  const produto = await prisma.produto.create({
    data: { nome, descricao, preco, foto, categoriaId, ordem },
    include: { categoria: true },
  });

  res.status(201).json(produto);
});

// PUT /produtos/:id — atualização parcial: só os campos enviados no corpo são alterados.
// Protegida: só o lojista autenticado pode editar produtos.
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

  const { nome, descricao, preco, foto, categoriaId, ordem } = corpo as {
    nome?: string;
    descricao?: string;
    preco?: number;
    foto?: string;
    categoriaId?: number;
    ordem?: number;
  };

  try {
    const produto = await prisma.produto.update({
      where: { id },
      data: { nome, descricao, preco, foto, categoriaId, ordem },
      include: { categoria: true },
    });
    res.json(produto);
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
      res.status(404).json({ erro: 'produto não encontrado' });
      return;
    }
    throw erro;
  }
});

// DELETE /produtos/:id — protegida: só o lojista autenticado pode remover produtos.
produtosRouter.delete('/:id', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  try {
    await prisma.produto.delete({ where: { id } });
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
