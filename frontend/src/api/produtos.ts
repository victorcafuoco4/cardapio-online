import type { Produto } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export async function buscarProdutos(): Promise<Produto[]> {
  const resposta = await fetch(`${API_URL}/produtos`);

  if (!resposta.ok) {
    throw new Error('Não foi possível carregar o cardápio.');
  }

  return resposta.json();
}
