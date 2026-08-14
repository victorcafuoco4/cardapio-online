import type { Produto } from '../types';
import { formatarPreco } from '../utils/formatarPreco';

type ProdutoCardProps = {
  produto: Produto;
  aoVerDetalhes: (produto: Produto) => void;
};

export function ProdutoCard({ produto, aoVerDetalhes }: ProdutoCardProps) {
  // Indisponível é decisão explícita do lojista — tem precedência sobre esgotado
  // (falta de estoque). Nos dois casos o produto continua visível, só não é comprável.
  const indisponivel = !produto.disponivel;
  const esgotado = produto.estoque === 0;
  const bloqueado = indisponivel || esgotado;

  return (
    <article className={bloqueado ? 'produto produto--esgotado' : 'produto'}>
      <img className="produto__foto" src={produto.foto} alt={produto.nome} />
      <div className="produto__info">
        <h3 className="produto__nome">{produto.nome}</h3>
        <p className="produto__descricao">{produto.descricao}</p>
        <span className="produto__preco">{formatarPreco(Number(produto.preco))}</span>
        {bloqueado ? (
          <span className="produto__esgotado">{indisponivel ? 'Indisponível' : 'Esgotado'}</span>
        ) : (
          <button className="produto__botao" onClick={() => aoVerDetalhes(produto)}>
            Ver detalhes
          </button>
        )}
      </div>
    </article>
  );
}
