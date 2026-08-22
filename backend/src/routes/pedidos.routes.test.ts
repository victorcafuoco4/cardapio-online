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
