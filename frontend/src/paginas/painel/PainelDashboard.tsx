import { useEffect, useState } from 'react';
import { buscarResumoDashboard } from '../../api/dashboard';
import { GraficoFaturamentoDiario } from '../../components/painel/GraficoFaturamentoDiario';
import { GraficoFormaPagamento } from '../../components/painel/GraficoFormaPagamento';
import { formatarPreco } from '../../utils/formatarPreco';
import type { ResumoDashboard } from '../../types';

export function PainelDashboard() {
  const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    buscarResumoDashboard()
      .then(setResumo)
      .catch((erro) => setErro(erro instanceof Error ? erro.message : 'Não foi possível carregar o dashboard.'));
  }, []);

  if (erro) return <p className="estado estado--erro">{erro}</p>;
  if (!resumo) return <p className="estado">Carregando...</p>;

  return (
    <div className="painel-dashboard">
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
