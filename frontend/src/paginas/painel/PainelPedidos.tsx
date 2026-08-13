import { useCallback, useEffect, useState } from 'react';
import { atualizarStatusPedido, buscarPedidos } from '../../api/pedidos';
import { formatarPreco } from '../../utils/formatarPreco';
import type { PedidoResposta, StatusPedido } from '../../types';

const STATUS_OPCOES: StatusPedido[] = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO'];

const ROTULO_STATUS: Record<StatusPedido, string> = {
  RECEBIDO: 'Recebido',
  EM_PREPARO: 'Em preparo',
  PRONTO: 'Pronto',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const ROTULO_ENTREGA = { RETIRADA: 'Retirada', ENTREGA: 'Entrega' };
const ROTULO_PAGAMENTO = { DINHEIRO: 'Dinheiro', CARTAO: 'Cartão', PIX: 'Pix' };

// Atualiza sozinho a cada 15s, pra pedidos novos aparecerem sem precisar
// clicar em "Atualizar" ou trocar de aba.
const INTERVALO_ATUALIZACAO_MS = 15000;

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function PainelPedidos() {
  const [pedidos, setPedidos] = useState<PedidoResposta[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<number | null>(null);

  const carregar = useCallback(() => {
    buscarPedidos()
      .then(setPedidos)
      .catch((erro) => setErro(erro instanceof Error ? erro.message : 'Não foi possível carregar os pedidos.'));
  }, []);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(intervalo);
  }, [carregar]);

  async function aoMudarStatus(pedido: PedidoResposta, novoStatus: StatusPedido) {
    setErroAcao(null);
    setAtualizandoId(pedido.id);
    try {
      const pedidoAtualizado = await atualizarStatusPedido(pedido.id, novoStatus);
      setPedidos((atual) => atual?.map((p) => (p.id === pedido.id ? pedidoAtualizado : p)) ?? atual);
    } catch (erro) {
      setErroAcao(erro instanceof Error ? erro.message : 'Não foi possível atualizar o status.');
    } finally {
      setAtualizandoId(null);
    }
  }

  return (
    <div className="painel-secao">
      <div className="painel-secao__cabecalho">
        <h2>Pedidos</h2>
        <button className="botao-secundario" onClick={carregar}>
          Atualizar
        </button>
      </div>

      {erro && <p className="estado estado--erro">{erro}</p>}
      {erroAcao && <p className="estado estado--erro">{erroAcao}</p>}
      {!erro && !pedidos && <p className="estado">Carregando...</p>}
      {pedidos && pedidos.length === 0 && <p className="estado">Nenhum pedido recebido ainda.</p>}

      {pedidos && pedidos.length > 0 && (
        <div className="tabela-painel-wrapper">
          <table className="tabela-painel tabela-painel--pedidos">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Pagamento</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Status</th>
                <th>Recebido em</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td>#{pedido.id}</td>
                  <td>
                    {pedido.nomeCliente}
                    <br />
                    <span className="tabela-painel__discreto">{pedido.telefone}</span>
                  </td>
                  <td>
                    {ROTULO_ENTREGA[pedido.tipoEntrega]}
                    {pedido.endereco && (
                      <>
                        <br />
                        <span className="tabela-painel__discreto">{pedido.endereco}</span>
                      </>
                    )}
                  </td>
                  <td>{ROTULO_PAGAMENTO[pedido.formaPagamento]}</td>
                  <td>{pedido.itens.reduce((total, item) => total + item.quantidade, 0)}</td>
                  <td>{formatarPreco(Number(pedido.total))}</td>
                  <td>
                    <select
                      value={pedido.status}
                      disabled={atualizandoId === pedido.id}
                      onChange={(e) => aoMudarStatus(pedido, e.target.value as StatusPedido)}
                    >
                      {STATUS_OPCOES.map((status) => (
                        <option key={status} value={status}>
                          {ROTULO_STATUS[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatarData(pedido.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
