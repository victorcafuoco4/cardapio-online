import { useState } from 'react';
import { formatarPreco, formatarPrecoCompacto } from '../../utils/formatarPreco';
import type { FaturamentoDia } from '../../types';

type GraficoFaturamentoDiarioProps = {
  dados: FaturamentoDia[];
};

// Passos "redondos" pra escala do eixo Y — nunca um valor tipo "R$ 224,30" na grade.
const PASSOS_EIXO = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];

function calcularEixoMax(valorMaximo: number): number {
  if (valorMaximo <= 0) return PASSOS_EIXO[0];
  const passo = PASSOS_EIXO.find((p) => p * 4 >= valorMaximo) ?? PASSOS_EIXO[PASSOS_EIXO.length - 1];
  return Math.ceil(valorMaximo / passo) * passo;
}

// "2026-08-12" -> "12/08". Evita `new Date(string)`, que interpreta a data como
// UTC meia-noite e pode exibir o dia errado em fusos horários negativos.
function formatarDiaAbreviado(data: string): string {
  const [, mes, dia] = data.split('-');
  return `${dia}/${mes}`;
}

// Caminho de uma barra vertical com o topo arredondado e a base reta, encostada na baseline.
function pathBarraVertical(x: number, y: number, largura: number, altura: number, raio: number): string {
  const r = Math.min(raio, largura / 2, altura);
  return `M${x},${y + altura} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + largura - r},${y} Q${x + largura},${y} ${x + largura},${y + r} L${x + largura},${y + altura} Z`;
}

const LARGURA_VIEWBOX = 600;
const ALTURA_VIEWBOX = 210;
const MARGEM_ESQUERDA = 52;
const MARGEM_DIREITA = 8;
const MARGEM_TOPO = 12;
const ALTURA_GRAFICO = 140;
const FAIXA_EIXO_X = 28;

export function GraficoFaturamentoDiario({ dados }: GraficoFaturamentoDiarioProps) {
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null);
  const [modoTabela, setModoTabela] = useState(false);

  const valores = dados.map((item) => Number(item.total));
  const maximo = calcularEixoMax(Math.max(...valores, 0));
  const larguraPlot = LARGURA_VIEWBOX - MARGEM_ESQUERDA - MARGEM_DIREITA;
  const larguraSlot = larguraPlot / dados.length;
  const larguraBarra = Math.min(24, larguraSlot * 0.55);

  return (
    <div className="grafico-card">
      <div className="grafico-card__cabecalho">
        <h3>Faturamento — últimos 14 dias</h3>
        <button className="grafico-card__alternar" onClick={() => setModoTabela((atual) => !atual)}>
          {modoTabela ? 'Ver gráfico' : 'Ver como tabela'}
        </button>
      </div>

      {modoTabela ? (
        <table className="tabela-painel">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((item) => (
              <tr key={item.data}>
                <td>{formatarDiaAbreviado(item.data)}</td>
                <td>{formatarPreco(Number(item.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="grafico-diario">
          <svg
            viewBox={`0 0 ${LARGURA_VIEWBOX} ${ALTURA_VIEWBOX}`}
            role="img"
            aria-label="Faturamento diário dos últimos 14 dias"
          >
            {[0, 0.5, 1].map((fracao) => {
              const y = MARGEM_TOPO + ALTURA_GRAFICO * (1 - fracao);
              return (
                <g key={fracao}>
                  <line
                    x1={MARGEM_ESQUERDA}
                    x2={LARGURA_VIEWBOX - MARGEM_DIREITA}
                    y1={y}
                    y2={y}
                    className="grafico-grade"
                  />
                  <text
                    x={MARGEM_ESQUERDA - 6}
                    y={y}
                    className="grafico-eixo-texto"
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {formatarPrecoCompacto(maximo * fracao)}
                  </text>
                </g>
              );
            })}
            <line
              x1={MARGEM_ESQUERDA}
              x2={LARGURA_VIEWBOX - MARGEM_DIREITA}
              y1={MARGEM_TOPO + ALTURA_GRAFICO}
              y2={MARGEM_TOPO + ALTURA_GRAFICO}
              className="grafico-eixo-base"
            />

            {dados.map((item, indice) => {
              const valor = Number(item.total);
              const altura = maximo > 0 ? (valor / maximo) * ALTURA_GRAFICO : 0;
              const x = MARGEM_ESQUERDA + indice * larguraSlot + (larguraSlot - larguraBarra) / 2;
              const y = MARGEM_TOPO + ALTURA_GRAFICO - altura;
              const ativo = indiceAtivo === indice;

              return (
                <g key={item.data}>
                  {altura > 0 && (
                    <path
                      d={pathBarraVertical(x, y, larguraBarra, altura, 4)}
                      className={ativo ? 'grafico-barra grafico-barra--ativa' : 'grafico-barra'}
                    />
                  )}
                  {/* Rotula a cada 2 dias, ancorado no dia mais recente — assim "hoje"
                      (o mais importante do gráfico) sempre aparece, mesmo com 14 dias (par). */}
                  {(dados.length - 1 - indice) % 2 === 0 && (
                    <text
                      x={MARGEM_ESQUERDA + indice * larguraSlot + larguraSlot / 2}
                      y={MARGEM_TOPO + ALTURA_GRAFICO + 18}
                      className="grafico-eixo-texto"
                      textAnchor="middle"
                    >
                      {formatarDiaAbreviado(item.data)}
                    </text>
                  )}
                  {/* Alvo de clique/hover invisível cobrindo a coluna inteira — maior que a
                      barra, e presente mesmo em dias com faturamento zero (sem barra visível). */}
                  <rect
                    x={MARGEM_ESQUERDA + indice * larguraSlot}
                    y={MARGEM_TOPO}
                    width={larguraSlot}
                    height={ALTURA_GRAFICO + FAIXA_EIXO_X}
                    fill="transparent"
                    tabIndex={0}
                    role="img"
                    aria-label={`${formatarDiaAbreviado(item.data)}: ${formatarPreco(valor)}`}
                    onMouseEnter={() => setIndiceAtivo(indice)}
                    onMouseLeave={() => setIndiceAtivo(null)}
                    onFocus={() => setIndiceAtivo(indice)}
                    onBlur={() => setIndiceAtivo(null)}
                  />
                </g>
              );
            })}
          </svg>

          {indiceAtivo !== null && (
            <div
              className="grafico-tooltip"
              style={{
                left: `${
                  ((MARGEM_ESQUERDA + (indiceAtivo + 0.5) * larguraSlot) / LARGURA_VIEWBOX) * 100
                }%`,
              }}
            >
              <strong>{formatarPreco(valores[indiceAtivo])}</strong>
              <span>{formatarDiaAbreviado(dados[indiceAtivo].data)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
