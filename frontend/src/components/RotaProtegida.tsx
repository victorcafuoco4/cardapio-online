import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { autenticado, carregando } = useAuth();

  if (carregando) {
    return <p className="estado">Carregando...</p>;
  }

  if (!autenticado) {
    return <Navigate to="/painel/login" replace />;
  }

  return <>{children}</>;
}
