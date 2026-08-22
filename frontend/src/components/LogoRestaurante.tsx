import { useState } from 'react';

type LogoRestauranteProps = {
  nome: string;
  // Ainda não existe fonte de dado pra isso (sem upload, sem configuração no
  // painel nesta etapa) — o prop já existe pronto pra receber o logoUrl salvo
  // pelo painel no futuro. Enquanto ninguém passar nada, mostra o fallback.
  logoUrl?: string | null;
};

// Iniciais a partir do nome do restaurante — só usado no fallback.
function calcularIniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palavra) => palavra[0])
    .join('')
    .toUpperCase();
}

// Espaço pro logo no cabeçalho público. Sem imagem/URL externa: enquanto não
// houver logoUrl configurado (ou se a URL falhar ao carregar), mostra um
// fallback com as iniciais do nome — nunca um ícone de imagem quebrada.
export function LogoRestaurante({ nome, logoUrl }: LogoRestauranteProps) {
  const [falhouAoCarregar, setFalhouAoCarregar] = useState(false);
  const temLogo = !!logoUrl && logoUrl.trim().length > 0 && !falhouAoCarregar;

  if (temLogo) {
    return (
      <img
        className="logo-restaurante"
        src={logoUrl}
        alt={`Logo de ${nome}`}
        onError={() => setFalhouAoCarregar(true)}
      />
    );
  }

  return (
    <div className="logo-restaurante logo-restaurante--fallback" role="img" aria-label={`Logo de ${nome}`}>
      {calcularIniciais(nome)}
    </div>
  );
}
