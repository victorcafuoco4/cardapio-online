import type { PedidoFinalizado } from '../types';
import { formatarPreco } from '../utils/formatarPreco';

type ConfirmacaoPedidoProps = {
  pedido: PedidoFinalizado;
  aoNovoPedido: () => void;
};

const ROTULO_ENTREGA = {
  retirada: 'Retirada no local',
  entrega: 'Entrega',
};

const ROTULO_PAGAMENTO = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão na entrega',
  pix: 'Pix',
};

export function ConfirmacaoPedido({ pedido, aoNovoPedido }: ConfirmacaoPedidoProps) {
  const { itens, total, dados } = pedido;

  return (
    <div className="confirmacao">
      <p className="confirmacao__icone" aria-hidden="true">
        ✓
      </p>
      <h2>Pedido recebido!</h2>
      <p className="confirmacao__aviso">
        Essa é uma prévia do fluxo — o pedido ainda não é enviado pra cozinha (isso chega numa etapa futura do
        projeto).
      </p>

      <ul className="lista-carrinho">
        {itens.map((item) => (
          <li key={item.id} className="item-carrinho">
            <span className="item-carrinho__nome">
              {item.quantidade}x {item.nome}
            </span>
            <span className="item-carrinho__subtotal">{formatarPreco(Number(item.preco) * item.quantidade)}</span>
          </li>
        ))}
      </ul>
      <p className="carrinho__total-geral">
        Total: <span>{formatarPreco(total)}</span>
      </p>

      <dl className="confirmacao__dados">
        <div>
          <dt>Nome</dt>
          <dd>{dados.nomeCliente}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>{dados.telefone}</dd>
        </div>
        <div>
          <dt>Entrega</dt>
          <dd>{ROTULO_ENTREGA[dados.tipoEntrega]}</dd>
        </div>
        {dados.endereco && (
          <div>
            <dt>Endereço</dt>
            <dd>{dados.endereco}</dd>
          </div>
        )}
        <div>
          <dt>Pagamento</dt>
          <dd>
            {ROTULO_PAGAMENTO[dados.formaPagamento]}
            {dados.trocoPara && ` (troco para ${dados.trocoPara})`}
          </dd>
        </div>
        {dados.observacoes && (
          <div>
            <dt>Observações</dt>
            <dd>{dados.observacoes}</dd>
          </div>
        )}
      </dl>

      <button className="dialog__adicionar" onClick={aoNovoPedido}>
        Fazer novo pedido
      </button>
    </div>
  );
}
