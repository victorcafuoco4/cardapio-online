import { apiAutenticada } from './http';
import type { Produto } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

// ordem não faz parte do payload — é sempre automática no backend
// (posição final na criação, PATCH /produtos/reordenar pra reordenar).
export type DadosProduto = {
  nome: string;
  descricao: string;
  preco: number;
  foto: string;
  categoriaId: number;
  estoque?: number;
  disponivel?: boolean;
};

// Cold start do free tier do Render pode levar até ~50s pra acordar o backend;
// sem esse limite, a tela fica presa em "Carregando cardápio..." indefinidamente
// se a requisição nunca chegar a resolver.
const TIMEOUT_CARDAPIO_MS = 60_000;

export async function buscarProdutos(): Promise<Produto[]> {
  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), TIMEOUT_CARDAPIO_MS);

  try {
    const resposta = await fetch(`${API_URL}/produtos`, { signal: controlador.signal });

    if (!resposta.ok) {
      throw new Error('Não foi possível carregar o cardápio.');
    }

    return await resposta.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export function criarProduto(dados: DadosProduto): Promise<Produto> {
  return apiAutenticada<Produto>('/produtos', { method: 'POST', body: JSON.stringify(dados) });
}

export function atualizarProduto(id: number, dados: Partial<DadosProduto>): Promise<Produto> {
  return apiAutenticada<Produto>(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
}

export function removerProduto(id: number): Promise<void> {
  return apiAutenticada<void>(`/produtos/${id}`, { method: 'DELETE' });
}

// Manda a nova ordem completa dos produtos de uma categoria; o backend reescreve
// ordem de forma densa e atômica (ou tudo aplica, ou nada aplica).
export function reordenarProdutos(categoriaId: number, ids: number[]): Promise<Produto[]> {
  return apiAutenticada<Produto[]>('/produtos/reordenar', {
    method: 'PATCH',
    body: JSON.stringify({ categoriaId, ids }),
  });
}
