import { useCallback, useEffect, useState } from 'react';
import { buscarResumoDashboard } from '../../api/dashboard';
import { GraficoFaturamentoDiario } from '../../components/painel/GraficoFaturamentoDiario';
import { GraficoFormaPagamento } from '../../components/painel/GraficoFormaPagamento';
import { formatarPreco } from '../../utils/formatarPreco';
import type { ResumoDashboard } from '../../types';

// Atualiza sozinho a cada 15s — sem isso, o número de pedidos e os gráficos
// ficam presos no snapshot do primeiro carregamento enquanto a aba Dashboard
// continuar montada, mesmo que cheguem pedidos novos nesse meio-tempo.
const INTERVALO_ATUALIZACAO_MS = 15000;

export function PainelDashboard() {
  const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    buscarResumoDashboard()
      .then(setResumo)
      .catch((erro) => setErro(erro instanceof Error ? erro.message : 'Não foi possível carregar o dashboard.'));
  }, []);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(intervalo);
  }, [carregar]);

  if (erro) return <p className="estado estado--erro">{erro}</p>;
  if (!resumo) return <p className="estado">Carregando...</p>;

  return (
    <div className="painel-dashboard">
      <h3 className="painel-dashboard__secao-titulo">Hoje</h3>
      <div className="stat-tiles">
        <div className="stat-tile">
          <p className="stat-tile__rotulo">Vendas hoje</p>
          <p className="stat-tile__valor">{resumo.vendasHoje}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile__rotulo">Faturamento hoje</p>
          <p className="stat-tile__valor">{formatarPreco(Number(resumo.faturamentoHoje))}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile__rotulo">Pedidos em aberto</p>
          <p className="stat-tile__valor">{resumo.pedidosEmAberto}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile__rotulo">Ticket médio hoje</p>
          <p className="stat-tile__valor">{formatarPreco(Number(resumo.ticketMedioHoje))}</p>
        </div>
      </div>

      <h3 className="painel-dashboard__secao-titulo">Histórico</h3>
      <div className="stat-tiles">
        <div className="stat-tile">
          <p className="stat-tile__rotulo">Pedidos</p>
          <p className="stat-tile__valor">{resumo.totalPedidos}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile__rotulo">Faturamento total</p>
          <p className="stat-tile__valor">{formatarPreco(Number(resumo.faturamentoTotal))}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-tile__rotulo">Ticket médio</p>
          <p className="stat-tile__valor">{formatarPreco(Number(resumo.ticketMedio))}</p>
        </div>
      </div>

      <GraficoFaturamentoDiario dados={resumo.faturamentoPorDia} />

      <GraficoFormaPagamento dados={resumo.faturamentoPorFormaPagamento} />

      <div className="grafico-card">
        <h3>Produtos mais vendidos</h3>
        {resumo.produtosMaisVendidos.length === 0 ? (
          <p className="estado">Nenhuma venda registrada ainda.</p>
        ) : (
          <table className="tabela-painel">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Receita</th>
              </tr>
            </thead>
            <tbody>
              {resumo.produtosMaisVendidos.map((produto) => (
                <tr key={produto.nome}>
                  <td>{produto.nome}</td>
                  <td>{produto.quantidade}</td>
                  <td>{formatarPreco(Number(produto.receita))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
