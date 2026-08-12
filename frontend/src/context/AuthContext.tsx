import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { buscarPerfil, login as loginApi } from '../api/auth';
import type { Usuario } from '../types';

const CHAVE_TOKEN = 'cardapio-online:token';

type AuthContextValor = {
  usuario: Usuario | null;
  carregando: boolean;
  autenticado: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
};

const AuthContext = createContext<AuthContextValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  // Começa true: até validarmos um token salvo, não sabemos se o usuário está logado.
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(CHAVE_TOKEN);
    if (!token) {
      setCarregando(false);
      return;
    }

    buscarPerfil(token)
      .then(setUsuario)
      .catch(() => localStorage.removeItem(CHAVE_TOKEN))
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await loginApi(email, senha);
    localStorage.setItem(CHAVE_TOKEN, resposta.token);
    setUsuario(resposta.usuario);
  }, []);

  const sair = useCallback(() => {
    localStorage.removeItem(CHAVE_TOKEN);
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, autenticado: usuario !== null, entrar, sair }),
    [usuario, carregando, entrar, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValor {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  }
  return contexto;
}
