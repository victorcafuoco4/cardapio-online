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

// PATCH /categorias/reordenar — recebe a nova ordem completa das categorias e
// reescreve ordem de forma densa (0..N-1), tudo numa transação: ou a lista
// inteira aplica, ou nada aplica. Protegida.
categoriasRouter.patch('/reordenar', autenticar, async (req, res) => {
  const { ids } = req.body ?? {};

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id: unknown) => Number.isInteger(id))) {
    res.status(400).json({ erro: 'ids deve ser uma lista não vazia de números inteiros' });
    return;
  }
  const idsUnicos = new Set<number>(ids);
  if (idsUnicos.size !== ids.length) {
    res.status(400).json({ erro: 'ids não pode conter valores duplicados' });
    return;
  }

  const categoriasAtuais = await prisma.categoria.findMany({ select: { id: true } });
  const idsAtuais = new Set(categoriasAtuais.map((categoria) => categoria.id));

  const mesmoConjunto = idsAtuais.size === idsUnicos.size && [...idsAtuais].every((id) => idsUnicos.has(id));
  if (!mesmoConjunto) {
    res.status(400).json({
      erro: 'ids deve conter exatamente todas as categorias existentes, sem faltar nem repetir',
    });
    return;
  }

  const categorias = await prisma.$transaction(
    (ids as number[]).map((id, indice) => prisma.categoria.update({ where: { id }, data: { ordem: indice } })),
  );

  res.json(categorias.sort((a, b) => a.ordem - b.ordem));
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
};

// "ordem" não é aceita aqui de propósito — é inteiramente gerenciada pelo
// backend (posição automática na criação, PATCH /categorias/reordenar).
function validarCamposCategoria(corpo: CorpoCategoria, { parcial }: { parcial: boolean }): string[] {
  const erros: string[] = [];

  const valor = corpo.nome;
  if (valor === undefined) {
    if (!parcial) erros.push('nome é obrigatório');
  } else if (typeof valor !== 'string' || valor.trim().length === 0) {
    erros.push('nome deve ser um texto não vazio');
  }

  return erros;
}

// POST /categorias — protegida: só o lojista autenticado pode criar categorias.
// ordem é sempre automática: a categoria nova entra no final da lista.
categoriasRouter.post('/', autenticar, async (req, res) => {
  const erros = validarCamposCategoria(req.body ?? {}, { parcial: false });
  if (erros.length > 0) {
    res.status(400).json({ erros });
    return;
  }

  const { nome } = req.body;
  // Estritamente depois do maior "ordem" já existente — funciona mesmo que a
  // sequência atual não comece em 0 (dados antigos, criados antes desta regra).
  // count() colidiria nesse caso; max+1 nunca colide.
  const maximo = await prisma.categoria.aggregate({ _max: { ordem: true } });
  const ordem = (maximo._max.ordem ?? -1) + 1;

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

  const { nome } = corpo as { nome?: string };

  try {
    const categoria = await prisma.categoria.update({ where: { id }, data: { nome } });
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
// Recompacta a ordem das categorias restantes depois de remover, na mesma transação.
categoriasRouter.delete('/:id', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ erro: 'id inválido' });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.categoria.delete({ where: { id } });

      const restantes = await tx.categoria.findMany({ orderBy: { ordem: 'asc' } });
      await Promise.all(
        restantes.map((categoria, indice) =>
          categoria.ordem === indice
            ? Promise.resolve(categoria)
            : tx.categoria.update({ where: { id: categoria.id }, data: { ordem: indice } }),
        ),
      );
    });
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
