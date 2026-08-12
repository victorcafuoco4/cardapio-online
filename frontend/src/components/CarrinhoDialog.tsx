import { useEffect, useRef, useState } from 'react';
import { criarPedido } from '../api/pedidos';
import { useCarrinho } from '../context/CarrinhoContext';
import { formatarPreco } from '../utils/formatarPreco';
import { FormularioCheckout } from './FormularioCheckout';
import { ConfirmacaoPedido } from './ConfirmacaoPedido';
import type { DadosPedido, PedidoResposta } from '../types';

type CarrinhoDialogProps = {
  aberto: boolean;
  aoFechar: () => void;
};

type Etapa = 'itens' | 'checkout' | 'confirmacao';

export function CarrinhoDialog({ aberto, aoFechar }: CarrinhoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { itens, aumentarQuantidade, diminuirQuantidade, limparCarrinho, precoTotal } = useCarrinho();
  const [etapa, setEtapa] = useState<Etapa>('itens');
  const [pedidoConfirmado, setPedidoConfirmado] = useState<PedidoResposta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (aberto) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [aberto]);

  // Volta pro passo inicial sempre que o modal fecha (Esc, botão de fechar ou de fora),
  // pra reabrir do jeito esperado na próxima vez.
  function aoFecharDialog() {
    setEtapa('itens');
    setErroEnvio(null);
    aoFechar();
  }

  async function confirmarPedido(dados: DadosPedido) {
    setEnviando(true);
    setErroEnvio(null);
    try {
      const pedido = await criarPedido(dados, itens);
      setPedidoConfirmado(pedido);
      limparCarrinho();
      setEtapa('confirmacao');
    } catch (erro) {
      setErroEnvio(erro instanceof Error ? erro.message : 'Não foi possível enviar o pedido.');
    } finally {
      setEnviando(false);
    }
  }

  function novoPedido() {
    setPedidoConfirmado(null);
    setEtapa('itens');
    dialogRef.current?.close();
  }

  return (
    <dialog ref={dialogRef} className="dialog-carrinho" onClose={aoFecharDialog}>
      <button className="dialog__fechar" aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
        ×
      </button>

      {etapa === 'itens' && (
        <>
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
                <span className="item-carrinho__subtotal">
                  {formatarPreco(Number(item.preco) * item.quantidade)}
                </span>
              </li>
            ))}
          </ul>
          <p className="carrinho__total-geral">
            Total: <span>{formatarPreco(precoTotal)}</span>
          </p>
          <button
            className="dialog__adicionar"
            disabled={itens.length === 0}
            onClick={() => setEtapa('checkout')}
          >
            Finalizar pedido
          </button>
        </>
      )}

      {etapa === 'checkout' && (
        <FormularioCheckout
          aoConfirmar={confirmarPedido}
          aoVoltar={() => setEtapa('itens')}
          enviando={enviando}
          erro={erroEnvio}
        />
      )}

      {etapa === 'confirmacao' && pedidoConfirmado && (
        <ConfirmacaoPedido pedido={pedidoConfirmado} aoNovoPedido={novoPedido} />
      )}
    </dialog>
  );
}
