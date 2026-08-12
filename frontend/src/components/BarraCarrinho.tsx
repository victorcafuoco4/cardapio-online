import { useCarrinho } from '../context/CarrinhoContext';
import { formatarPreco } from '../utils/formatarPreco';

type BarraCarrinhoProps = {
  aoAbrir: () => void;
};

export function BarraCarrinho({ aoAbrir }: BarraCarrinhoProps) {
  const { quantidadeTotal, precoTotal } = useCarrinho();

  if (quantidadeTotal === 0) return null;

  return (
    <button className="barra-carrinho" onClick={aoAbrir}>
      <span>
        {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}
      </span>
      <span>{formatarPreco(precoTotal)}</span>
    </button>
  );
}
