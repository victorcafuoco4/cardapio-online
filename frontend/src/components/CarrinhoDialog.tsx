import { useEffect, useRef } from 'react';
import { useCarrinho } from '../context/CarrinhoContext';
import { formatarPreco } from '../utils/formatarPreco';

type CarrinhoDialogProps = {
  aberto: boolean;
  aoFechar: () => void;
};

export function CarrinhoDialog({ aberto, aoFechar }: CarrinhoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { itens, aumentarQuantidade, diminuirQuantidade, precoTotal } = useCarrinho();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (aberto) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [aberto]);

  return (
    <dialog ref={dialogRef} className="dialog-carrinho" onClose={aoFechar}>
      <button className="dialog__fechar" aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
        ×
      </button>
      <h2>Seu carrinho</h2>
      <ul className="lista-carrinho">
        {itens.map((item) => (
          <li key={item.id} className="item-carrinho">
            <span className="item-carrinho__nome">{item.nome}</span>
            <div className="item-carrinho__controles">
              <button aria-label="Diminuir quantidade" onClick={() => diminuirQuantidade(item.id)}>
                −
              </button>
              <span>{item.quantidade}</span>
              <button aria-label="Aumentar quantidade" onClick={() => aumentarQuantidade(item.id)}>
                +
              </button>
            </div>
            <span className="item-carrinho__subtotal">{formatarPreco(Number(item.preco) * item.quantidade)}</span>
          </li>
        ))}
      </ul>
      <p className="carrinho__total-geral">
        Total: <span>{formatarPreco(precoTotal)}</span>
      </p>
    </dialog>
  );
}
