import { obterToken } from '../auth/token';

const API_URL = import.meta.env.VITE_API_URL;

async function tratarResposta<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    const corpoErro = await resposta.json().catch(() => null);
    const mensagem =
      corpoErro?.erro ??
      (Array.isArray(corpoErro?.erros) ? corpoErro.erros.join(', ') : null) ??
      'Ocorreu um erro inesperado.';
    throw new Error(mensagem);
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  return resposta.json();
}

export async function apiPublica<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch(`${API_URL}${caminho}`, opcoes);
  return tratarResposta<T>(resposta);
}

// Anexa o token do lojista logado. Usada pelas rotas de escrita do painel
// (criar/editar/remover produtos e categorias), que exigem autenticação no backend.
export async function apiAutenticada<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: {
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...opcoes.headers,
      Authorization: `Bearer ${obterToken()}`,
    },
  });
  return tratarResposta<T>(resposta);
}
