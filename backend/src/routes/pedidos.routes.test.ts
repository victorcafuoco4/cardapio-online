import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../middleware/autenticar.js';

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tokenAdmin(): string {
  return jwt.sign({ usuarioId: 1 }, JWT_SECRET, { expiresIn: '1h' });
}

describe('IDOR — acompanhamento de pedidos', () => {
  let categoriaId: number;
  let produtoId: number;

  beforeAll(async () => {
    const categoria = await prisma.categoria.create({ data: { nome: 'Categoria de teste', ordem: 0 } });
    categoriaId = categoria.id;
    const produto = await prisma.produto.create({
      data: {
        nome: 'Produto de teste',
        descricao: 'Descrição de teste',
        preco: 10,
        foto: 'https://exemplo.com/foto.jpg',
        estoque: 100,
        disponivel: true,
        categoriaId,
      },
    });
    produtoId = produto.id;
  });

  afterAll(async () => {
    await prisma.itemPedido.deleteMany({});
    await prisma.pedido.deleteMany({});
    await prisma.produto.deleteMany({});
    await prisma.categoria.deleteMany({});
    await prisma.$disconnect();
  });

  async function criarPedidoDeTeste() {
    return request(app)
      .post('/pedidos')
      .send({
        nomeCliente: 'Cliente Teste',
        telefone: '11999990000',
        tipoEntrega: 'RETIRADA',
        formaPagamento: 'DINHEIRO',
        itens: [{ produtoId, quantidade: 2 }],
      });
  }

  it('criação de pedido retorna tokenAcompanhamento em formato UUID', async () => {
    const resposta = await criarPedidoDeTeste();

    expect(resposta.status).toBe(201);
    expect(typeof resposta.body.tokenAcompanhamento).toBe('string');
    expect(resposta.body.tokenAcompanhamento).toMatch(REGEX_UUID);
  });

  it('token válido retorna o pedido com os dados de acompanhamento', async () => {
    const criado = await criarPedidoDeTeste();
    const token = criado.body.tokenAcompanhamento;

    const resposta = await request(app).get(`/pedidos/acompanhar/${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('RECEBIDO');
    expect(resposta.body.tipoEntrega).toBe('RETIRADA');
    expect(Array.isArray(resposta.body.itens)).toBe(true);
    expect(resposta.body.itens[0]).toMatchObject({
      quantidade: 2,
      produto: { nome: 'Produto de teste' },
    });
  });

  it('token inválido (inexistente ou malformado) retorna 404, nunca 500', async () => {
    const inexistente = await request(app).get('/pedidos/acompanhar/00000000-0000-4000-8000-000000000000');
    expect(inexistente.status).toBe(404);

    const malformado = await request(app).get('/pedidos/acompanhar/nao-e-um-uuid');
    expect(malformado.status).toBe(404);
  });

  it('resposta pública nunca contém dados pessoais nem o id interno', async () => {
    const criado = await criarPedidoDeTeste();
    const token = criado.body.tokenAcompanhamento;

    const resposta = await request(app).get(`/pedidos/acompanhar/${token}`);

    expect(resposta.status).toBe(200);
    const camposProibidos = [
      'id',
      'nomeCliente',
      'telefone',
      'endereco',
      'observacoes',
      'trocoPara',
      'formaPagamento',
      'tokenAcompanhamento',
    ];
    for (const campo of camposProibidos) {
      expect(resposta.body).not.toHaveProperty(campo);
    }
  });

  it('GET /pedidos/:id numérico é bloqueado sem autenticação', async () => {
    const criado = await criarPedidoDeTeste();
    const id = criado.body.id;

    const semToken = await request(app).get(`/pedidos/${id}`);
    expect(semToken.status).toBe(401);

    // o id numérico também não serve como token na rota pública
    const idComoToken = await request(app).get(`/pedidos/acompanhar/${id}`);
    expect(idComoToken.status).toBe(404);
  });

  it('painel administrativo continua funcional: listagem e detalhe autenticados', async () => {
    const criado = await criarPedidoDeTeste();
    const admin = tokenAdmin();

    const lista = await request(app).get('/pedidos').set('Authorization', `Bearer ${admin}`);
    expect(lista.status).toBe(200);
    expect(lista.body.some((p: { id: number }) => p.id === criado.body.id)).toBe(true);

    const detalhe = await request(app)
      .get(`/pedidos/${criado.body.id}`)
      .set('Authorization', `Bearer ${admin}`);
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.nomeCliente).toBe('Cliente Teste');
  });
});

// Regressão: a transição de status lia o pedido FORA da transação, então dois
// cancelamentos simultâneos decidiam pela mesma leitura obsoleta e devolviam o
// estoque duas vezes. O conserto trava a linha do pedido (SELECT ... FOR UPDATE)
// antes de ler, dentro da transação.
describe('Concorrência — cancelamento devolve estoque uma única vez', () => {
  const ESTOQUE_INICIAL = 100;
  const QUANTIDADE = 3;
  // Saldo logo após o pedido nascer: o POST /pedidos já reservou a quantidade.
  const ESTOQUE_RESERVADO = ESTOQUE_INICIAL - QUANTIDADE;

  let categoriaId: number;
  let contador = 0;

  beforeAll(async () => {
    const categoria = await prisma.categoria.create({
      data: { nome: 'Categoria cancelamento', ordem: 0 },
    });
    categoriaId = categoria.id;
  });

  afterAll(async () => {
    await prisma.itemPedido.deleteMany({});
    await prisma.pedido.deleteMany({});
    await prisma.produto.deleteMany({});
    await prisma.categoria.deleteMany({});
    await prisma.$disconnect();
  });

  // Produto novo a cada caso: cada teste mede o saldo de um estoque só dele,
  // sem depender da ordem de execução nem do que os outros casos fizeram.
  async function criarProdutoEPedido(): Promise<{ produtoId: number; pedidoId: number }> {
    contador += 1;
    const produto = await prisma.produto.create({
      data: {
        nome: `Produto cancelamento ${contador}`,
        descricao: 'Descrição de teste',
        preco: 10,
        foto: 'https://exemplo.com/foto.jpg',
        estoque: ESTOQUE_INICIAL,
        disponivel: true,
        categoriaId,
      },
    });

    const criado = await request(app)
      .post('/pedidos')
      .send({
        nomeCliente: 'Cliente Teste',
        telefone: '11999990000',
        tipoEntrega: 'RETIRADA',
        formaPagamento: 'DINHEIRO',
        itens: [{ produtoId: produto.id, quantidade: QUANTIDADE }],
      });
    expect(criado.status).toBe(201);

    return { produtoId: produto.id, pedidoId: criado.body.id };
  }

  function mudarStatus(pedidoId: number, status: string) {
    return request(app)
      .patch(`/pedidos/${pedidoId}/status`)
      .set('Authorization', `Bearer ${tokenAdmin()}`)
      .send({ status });
  }

  async function estoqueDe(produtoId: number): Promise<number> {
    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new Error(`produto ${produtoId} não encontrado`);
    return produto.estoque;
  }

  it('cancelar um pedido ativo devolve o estoque reservado', async () => {
    const { produtoId, pedidoId } = await criarProdutoEPedido();
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_RESERVADO);

    const resposta = await mudarStatus(pedidoId, 'CANCELADO');

    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('CANCELADO');
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_INICIAL);
  });

  it('cancelar de novo o mesmo pedido não devolve estoque outra vez', async () => {
    const { produtoId, pedidoId } = await criarProdutoEPedido();

    const primeira = await mudarStatus(pedidoId, 'CANCELADO');
    expect(primeira.status).toBe(200);
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_INICIAL);

    // Contrato preservado: repetir o cancelamento continua sendo 200, não erro.
    const segunda = await mudarStatus(pedidoId, 'CANCELADO');
    expect(segunda.status).toBe(200);
    expect(segunda.body.status).toBe('CANCELADO');
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_INICIAL);
  });

  it('dois cancelamentos concorrentes devolvem o estoque uma única vez', async () => {
    const { produtoId, pedidoId } = await criarProdutoEPedido();
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_RESERVADO);

    // Sem sleep nem ordenação artificial: as duas requisições partem juntas e a
    // asserção é sobre o invariante (o saldo final), que o lock de linha torna
    // determinístico qualquer que seja a ordem em que elas alcancem o banco.
    const [primeira, segunda] = await Promise.all([
      mudarStatus(pedidoId, 'CANCELADO'),
      mudarStatus(pedidoId, 'CANCELADO'),
    ]);

    expect(primeira.status).toBe(200);
    expect(segunda.status).toBe(200);
    // Antes do conserto, o saldo aqui virava ESTOQUE_INICIAL + QUANTIDADE.
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_INICIAL);

    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    expect(pedido?.status).toBe('CANCELADO');
  });

  it('reativar um pedido cancelado reserva o estoque de novo', async () => {
    const { produtoId, pedidoId } = await criarProdutoEPedido();

    await mudarStatus(pedidoId, 'CANCELADO');
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_INICIAL);

    const reativado = await mudarStatus(pedidoId, 'RECEBIDO');

    expect(reativado.status).toBe(200);
    expect(reativado.body.status).toBe('RECEBIDO');
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_RESERVADO);
  });

  it('transição entre status ativos não mexe no estoque e controla entregueEm', async () => {
    const { produtoId, pedidoId } = await criarProdutoEPedido();

    const emPreparo = await mudarStatus(pedidoId, 'EM_PREPARO');
    expect(emPreparo.status).toBe(200);
    expect(emPreparo.body.entregueEm).toBeNull();
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_RESERVADO);

    // Entrar em ENTREGUE grava a data de faturamento realizado.
    const entregue = await mudarStatus(pedidoId, 'ENTREGUE');
    expect(entregue.status).toBe(200);
    expect(entregue.body.entregueEm).not.toBeNull();
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_RESERVADO);

    // Sair de ENTREGUE limpa a data, pra não sobrar data órfã no dashboard.
    const voltou = await mudarStatus(pedidoId, 'PRONTO');
    expect(voltou.status).toBe(200);
    expect(voltou.body.entregueEm).toBeNull();
    expect(await estoqueDe(produtoId)).toBe(ESTOQUE_RESERVADO);
  });
});
