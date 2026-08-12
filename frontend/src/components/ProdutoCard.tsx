import type { Produto } from '../types';
import { formatarPreco } from '../utils/formatarPreco';

type ProdutoCardProps = {
  produto: Produto;
  aoVerDetalhes: (produto: Produto) => void;
};

export function ProdutoCard({ produto, aoVerDetalhes }: ProdutoCardProps) {
  return (
    <article className="produto">
      <img className="produto__foto" src={produto.foto} alt={produto.nome} />
      <div className="produto__info">
        <h3 className="produto__nome">{produto.nome}</h3>
        <p className="produto__descricao">{produto.descricao}</p>
        <span className="produto__preco">{formatarPreco(Number(produto.preco))}</span>
        <button className="produto__botao" onClick={() => aoVerDetalhes(produto)}>
          Ver detalhes
        </button>
      </div>
    </article>
  );
}
