import { apiAutenticada, apiPublica } from './http';
import type { Categoria } from '../types';

// ordem não faz parte do payload — é sempre automática no backend
// (posição final na criação, PATCH /categorias/reordenar pra reordenar).
export type DadosCategoria = {
  nome: string;
};

export function buscarCategorias(): Promise<Categoria[]> {
  return apiPublica<Categoria[]>('/categorias');
}

export function criarCategoria(dados: DadosCategoria): Promise<Categoria> {
  return apiAutenticada<Categoria>('/categorias', { method: 'POST', body: JSON.stringify(dados) });
}

export function atualizarCategoria(id: number, dados: Partial<DadosCategoria>): Promise<Categoria> {
  return apiAutenticada<Categoria>(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
}

export function removerCategoria(id: number): Promise<void> {
  return apiAutenticada<void>(`/categorias/${id}`, { method: 'DELETE' });
}

// Manda a nova ordem completa das categorias; o backend reescreve ordem de
// forma densa e atômica (ou tudo aplica, ou nada aplica).
export function reordenarCategorias(ids: number[]): Promise<Categoria[]> {
  return apiAutenticada<Categoria[]>('/categorias/reordenar', {
    method: 'PATCH',
    body: JSON.stringify({ ids }),
  });
}
