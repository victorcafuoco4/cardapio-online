import type { Produto } from '../types';
import { ProdutoCard } from './ProdutoCard';

type CategoriaSectionProps = {
  id: number;
  nome: string;
  produtos: Produto[];
  aoVerDetalhes: (produto: Produto) => void;
};

export function CategoriaSection({ id, nome, produtos, aoVerDetalhes }: CategoriaSectionProps) {
  const tituloId = `titulo-categoria-${id}`;

  return (
    <section className="categoria" aria-labelledby={tituloId}>
      <h2 id={tituloId}>{nome}</h2>
      <div className="lista-produtos">
        {produtos.map((produto) => (
          <ProdutoCard key={produto.id} produto={produto} aoVerDetalhes={aoVerDetalhes} />
        ))}
      </div>
    </section>
  );
}
