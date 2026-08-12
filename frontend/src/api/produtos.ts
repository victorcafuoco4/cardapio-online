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
};

export async function buscarProdutos(): Promise<Produto[]> {
  const resposta = await fetch(`${API_URL}/produtos`);

  if (!resposta.ok) {
    throw new Error('Não foi possível carregar o cardápio.');
  }

  return resposta.json();
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
