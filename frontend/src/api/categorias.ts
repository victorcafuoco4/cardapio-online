import { apiAutenticada, apiPublica } from './http';
import type { Categoria } from '../types';

export type DadosCategoria = {
  nome: string;
  ordem?: number;
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
