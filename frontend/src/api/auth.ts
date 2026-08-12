import type { RespostaLogin, Usuario } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export async function login(email: string, senha: string): Promise<RespostaLogin> {
  const resposta = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });

  if (!resposta.ok) {
    const corpoErro = await resposta.json().catch(() => null);
    throw new Error(corpoErro?.erro ?? 'Não foi possível fazer login.');
  }

  return resposta.json();
}

export async function buscarPerfil(token: string): Promise<Usuario> {
  const resposta = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resposta.ok) {
    throw new Error('Sessão expirada.');
  }

  return resposta.json();
}
