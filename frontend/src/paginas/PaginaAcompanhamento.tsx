import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buscarPedido } from '../api/pedidos';
import { formatarPreco } from '../utils/formatarPreco';
import type { PedidoResposta, StatusPedido } from '../types';

const ETAPAS: StatusPedido[] = ['RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];

const ROTULO_STATUS: Record<StatusPedido, string> = {
  RECEBIDO: 'Pedido recebido',
  EM_PREPARO: 'Em preparo',
  PRONTO: 'Pronto',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const ROTULO_ENTREGA = { RETIRADA: 'Retirada no local', ENTREGA: 'Entrega' };

// A cada 15s busca de novo, só enquanto o pedido ainda não chegou num estado final —
// evita o cliente ter que ficar recarregando a página pra saber se já ficou pronto.
const INTERVALO_ATUALIZACAO_MS = 15000;

export function PaginaAcompanhamento() {
  const { id } = useParams();
  const [pedido, setPedido] = useState<PedidoResposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    if (!id || !Number.isInteger(Number(id))) {
      setErro('Número de pedido inválido.');
      return;
    }

    buscarPedido(Number(id))
      .then(setPedido)
      .catch((erro) => setErro(erro instanceof Error ? erro.message : 'Pedido não encontrado.'));
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!pedido || pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO') return;

    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(intervalo);
  }, [pedido, carregar]);

  if (erro) {
    return (
      <div className="pagina-acompanhamento">
        <div className="cartao-acompanhamento">
          <p className="estado estado--erro">{erro}</p>
          <Link to="/" className="botao-secundario acompanhamento__voltar">
            Voltar pro cardápio
          </Link>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="pagina-acompanhamento">
        <p className="estado">Carregando...</p>
      </div>
    );
  }

  const indiceAtual = ETAPAS.indexOf(pedido.status as (typeof ETAPAS)[number]);

  return (
    <div className="pagina-acompanhamento">
      <div className="cartao-acompanhamento">
        <h1>Pedido #{pedido.id}</h1>
        <p className="pagina-login__subtitulo">{ROTULO_ENTREGA[pedido.tipoEntrega]}</p>

        {pedido.status === 'CANCELADO' ? (
          <p className="acompanhamento__cancelado">Esse pedido foi cancelado.</p>
        ) : (
          <ol className="etapas-status">
            {ETAPAS.map((etapa, indice) => {
              const estado =
                indice < indiceAtual ? 'concluida' : indice === indiceAtual ? 'atual' : 'pendente';
              return (
                <li key={etapa} className={`etapa-status etapa-status--${estado}`}>
                  <span className="etapa-status__marcador" aria-hidden="true" />
                  {ROTULO_STATUS[etapa]}
                </li>
              );
            })}
          </ol>
        )}

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

        <Link to="/" className="botao-secundario acompanhamento__voltar">
          Voltar pro cardápio
        </Link>
      </div>
    </div>
  );
}
