import { LogoRestaurante } from './LogoRestaurante';

const NOME_RESTAURANTE = 'Doralina Vegana';

export function Cabecalho() {
  return (
    <header className="cabecalho">
      <LogoRestaurante nome={NOME_RESTAURANTE} />
      <h1>{NOME_RESTAURANTE}</h1>
      <p className="status status--aberta">Aberta agora</p>
    </header>
  );
}
