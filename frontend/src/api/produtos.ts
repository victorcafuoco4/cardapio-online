import { apiAutenticada } from './http';
import type { Produto } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export type DadosProduto = {
  nome: string;
  descricao: string;
  preco: number;
  foto: string;
  categoriaId: number;
  ordem?: number;
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
