import { Router } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { autenticar } from '../middleware/autenticar.js';

export const categoriasRouter = Router();

// GET /categorias — lista todas, na ordem de exibição do cardápio.
categoriasRouter.get('/', async (req, res) => {
  const categorias = await prisma.categoria.findMany({ orderBy: { ordem: 'asc' } });
  res.json(categorias);
});

// GET /categorias/:id
categoriasRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  const categoria = await prisma.categoria.findUnique({ where: { id } });
  if (!categoria) {
    res.status(404).json({ erro: 'categoria não encontrada' });
    return;
  }

  res.json(categoria);
});

type CorpoCategoria = {
  nome?: unknown;
  ordem?: unknown;
};

function validarCamposCategoria(corpo: CorpoCategoria, { parcial }: { parcial: boolean }): string[] {
  const erros: string[] = [];

  const validarCampo = (
    campo: keyof CorpoCategoria,
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
  // ordem tem valor default no schema, então nunca é obrigatório — só validado se enviado.
  validarCampo('ordem', (v) => Number.isInteger(v), 'ordem deve ser um número inteiro', { obrigatorio: false });

  return erros;
}

// POST /categorias — protegida: só o lojista autenticado pode criar categorias.
categoriasRouter.post('/', autenticar, async (req, res) => {
  const erros = validarCamposCategoria(req.body ?? {}, { parcial: false });
  if (erros.length > 0) {
    res.status(400).json({ erros });
    return;
  }

  const { nome, ordem } = req.body;

  const categoria = await prisma.categoria.create({ data: { nome, ordem } });
  res.status(201).json(categoria);
});

// PUT /categorias/:id — atualização parcial. Protegida: só o lojista autenticado.
categoriasRouter.put('/:id', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  const corpo: CorpoCategoria = req.body ?? {};
  const erros = validarCamposCategoria(corpo, { parcial: true });
  if (erros.length > 0) {
    res.status(400).json({ erros });
    return;
  }

  const { nome, ordem } = corpo as { nome?: string; ordem?: number };

  try {
    const categoria = await prisma.categoria.update({ where: { id }, data: { nome, ordem } });
    res.json(categoria);
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
      res.status(404).json({ erro: 'categoria não encontrada' });
      return;
    }
    throw erro;
  }
});

// DELETE /categorias/:id — protegida: só o lojista autenticado.
categoriasRouter.delete('/:id', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  try {
    await prisma.categoria.delete({ where: { id } });
    res.status(204).send();
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      if (erro.code === 'P2025') {
        res.status(404).json({ erro: 'categoria não encontrada' });
        return;
      }
      if (erro.code === 'P2003') {
        res.status(400).json({ erro: 'categoria possui produtos vinculados e não pode ser removida' });
        return;
      }
    }
    throw erro;
  }
});
