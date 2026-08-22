import { Link } from 'react-router-dom';
import type { PedidoResposta } from '../types';
import { formatarPreco } from '../utils/formatarPreco';

type ConfirmacaoPedidoProps = {
  pedido: PedidoResposta;
  aoNovoPedido: () => void;
};

const ROTULO_ENTREGA = {
  RETIRADA: 'Retirada no local',
  ENTREGA: 'Entrega',
};

const ROTULO_PAGAMENTO = {
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão na entrega',
  PIX: 'Pix',
};

export function ConfirmacaoPedido({ pedido, aoNovoPedido }: ConfirmacaoPedidoProps) {
  return (
    <div className="confirmacao">
      <p className="confirmacao__icone" aria-hidden="true">
        ✓
      </p>
      <h2>Pedido #{pedido.id} recebido!</h2>
      <p className="confirmacao__aviso">Guarde esse número — é a referência do seu pedido.</p>

      <ul className="lista-carrinho">
        {pedido.itens.map((item) => (
          <li key={item.id} className="item-carrinho">
            <span className="item-carrinho__nome">
              {item.quantidade}x {item.produto.nome}
            </span>
            <span className="item-carrinho__subtotal">
              {formatarPreco(Number(item.precoUnitario) * item.quantidade)}
            </span>
          </li>
        ))}
      </ul>
      <p className="carrinho__total-geral">
        Total: <span>{formatarPreco(Number(pedido.total))}</span>
      </p>

      <dl className="confirmacao__dados">
        <div>
          <dt>Nome</dt>
          <dd>{pedido.nomeCliente}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>{pedido.telefone}</dd>
        </div>
        <div>
          <dt>Entrega</dt>
          <dd>{ROTULO_ENTREGA[pedido.tipoEntrega]}</dd>
        </div>
        {pedido.endereco && (
          <div>
            <dt>Endereço</dt>
            <dd>{pedido.endereco}</dd>
          </div>
        )}
        <div>
          <dt>Pagamento</dt>
          <dd>
            {ROTULO_PAGAMENTO[pedido.formaPagamento]}
            {pedido.trocoPara && ` (troco para ${formatarPreco(Number(pedido.trocoPara))})`}
          </dd>
        </div>
        {pedido.observacoes && (
          <div>
            <dt>Observações</dt>
            <dd>{pedido.observacoes}</dd>
          </div>
        )}
      </dl>

      <Link to={`/pedido/${pedido.tokenAcompanhamento}`} className="botao-secundario acompanhamento__voltar">
        Acompanhar pedido
      </Link>
      <button className="dialog__adicionar" onClick={aoNovoPedido}>
        Fazer novo pedido
      </button>
    </div>
  );
}
