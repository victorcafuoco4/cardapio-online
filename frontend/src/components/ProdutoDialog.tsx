import { useEffect, useRef, useState } from 'react';
import type { Produto } from '../types';
import { formatarPreco } from '../utils/formatarPreco';
import { useCarrinho } from '../context/CarrinhoContext';

type ProdutoDialogProps = {
  produto: Produto | null;
  aoFechar: () => void;
};

export function ProdutoDialog({ produto, aoFechar }: ProdutoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantidade, setQuantidade] = useState(1);
  const { adicionarItem } = useCarrinho();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (produto) {
      setQuantidade(1);
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [produto]);

  return (
    // onClose cobre tanto o fechamento programático (dialog.close()) quanto
    // a tecla Esc, mantendo o estado do React em sincronia com o <dialog>.
    <dialog ref={dialogRef} className="dialog-produto" onClose={aoFechar}>
      {produto && (
        <>
          <button className="dialog__fechar" aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
          <img className="dialog__foto" src={produto.foto} alt={produto.nome} />
          <h3>{produto.nome}</h3>
          <p>{produto.descricao}</p>
          <p className="dialog__preco">{formatarPreco(Number(produto.preco))}</p>
          {produto.estoque <= 5 && (
            <p className="dialog__estoque-baixo">Apenas {produto.estoque} em estoque</p>
          )}
          <div className="dialog__quantidade">
            <button aria-label="Diminuir quantidade" onClick={() => setQuantidade((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span>{quantidade}</span>
            <button
              aria-label="Aumentar quantidade"
              onClick={() => setQuantidade((q) => Math.min(produto.estoque, q + 1))}
              disabled={quantidade >= produto.estoque}
            >
              +
            </button>
          </div>
          <button
            className="dialog__adicionar"
            onClick={() => {
              adicionarItem(produto, quantidade);
              dialogRef.current?.close();
            }}
          >
            Adicionar ao carrinho
          </button>
        </>
      )}
    </dialog>
  );
}
