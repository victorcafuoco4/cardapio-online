import type { Produto } from '../types';
import { ProdutoCard } from './ProdutoCard';

type CategoriaSectionProps = {
  id: number;
  nome: string;
  produtos: Produto[];
  aoVerDetalhes: (produto: Produto) => void;
  // Callback ref opcional: registra o elemento da seção pra rolagem
  // ("ir pra categoria") e pro observador de rolagem ("categoria ativa").
  // Omitido, a seção funciona igual — só não participa do scroll-spy.
  registrarSecao?: (elemento: HTMLElement | null) => void;
};

export function CategoriaSection({ id, nome, produtos, aoVerDetalhes, registrarSecao }: CategoriaSectionProps) {
  const tituloId = `titulo-categoria-${id}`;

  return (
    <section id={`categoria-${id}`} className="categoria" aria-labelledby={tituloId} ref={registrarSecao}>
      <h2 id={tituloId}>{nome}</h2>
      <div className="lista-produtos">
        {produtos.map((produto) => (
          <ProdutoCard key={produto.id} produto={produto} aoVerDetalhes={aoVerDetalhes} />
        ))}
      </div>
    </section>
  );
}
