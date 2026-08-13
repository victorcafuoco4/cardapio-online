import { formatarPreco } from '../../utils/formatarPreco';

type GraficoFormaPagamentoProps = {
  dados: Record<'DINHEIRO' | 'CARTAO' | 'PIX', string>;
};

// Ordem fixa e cores das 3 primeiras faixas da paleta categórica validada
// (skill de dataviz) — passam no teste all-pairs de daltonismo nos dois modos.
const CATEGORIAS: { chave: 'DINHEIRO' | 'CARTAO' | 'PIX'; rotulo: string; cor: string }[] = [
  { chave: 'DINHEIRO', rotulo: 'Dinheiro', cor: 'var(--dash-serie-1)' },
  { chave: 'CARTAO', rotulo: 'Cartão', cor: 'var(--dash-serie-2)' },
  { chave: 'PIX', rotulo: 'Pix', cor: 'var(--dash-serie-3)' },
];

export function GraficoFormaPagamento({ dados }: GraficoFormaPagamentoProps) {
  const valores = CATEGORIAS.map((categoria) => Number(dados[categoria.chave]));
  const maximo = Math.max(...valores, 0.01);

  return (
    <div className="grafico-card">
      <h3>Faturamento por forma de pagamento</h3>
      <ul className="grafico-barras-horizontais">
        {CATEGORIAS.map((categoria, indice) => {
          const valor = valores[indice];
          const percentual = valor > 0 ? Math.max((valor / maximo) * 100, 4) : 0;

          return (
            <li key={categoria.chave} className="grafico-barra-h">
              <span className="grafico-barra-h__rotulo">{categoria.rotulo}</span>
              <div className="grafico-barra-h__trilho">
                <div
                  className="grafico-barra-h__preenchimento"
                  style={{ width: `${percentual}%`, backgroundColor: categoria.cor }}
                />
              </div>
              <span className="grafico-barra-h__valor">{formatarPreco(valor)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
