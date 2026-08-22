import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatarPreco } from '../utils/formatarPreco';
import {
  GRUPO_UNIDADE,
  OPCOES_UNIDADE,
  calcularCustoIngrediente,
  calcularPrecificacao,
  criarDespesaVazia,
  criarIngredienteVazio,
} from '../utils/precificacao';
import type { DespesaFixa, Ingrediente, PercentuaisPreco, UnidadeQuantidade } from '../utils/precificacao';

const PERCENTUAIS_VAZIOS: PercentuaisPreco = {
  impostos: '',
  taxaPagamento: '',
  comissaoDelivery: '',
  outrasDespesasVariaveis: '',
  margemDesejada: '',
};

export function PaginaPrecificacao() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();

  const [nomePrato, setNomePrato] = useState('');
  const [rendimentoPorcoes, setRendimentoPorcoes] = useState('');
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([criarIngredienteVazio()]);
  const [embalagemPorPorcao, setEmbalagemPorPorcao] = useState('');
  const [maoDeObraTotal, setMaoDeObraTotal] = useState('');
  const [outrosCustosDiretos, setOutrosCustosDiretos] = useState('');
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([criarDespesaVazia()]);
  const [porcoesMensais, setPorcoesMensais] = useState('');
  const [percentuais, setPercentuais] = useState<PercentuaisPreco>(PERCENTUAIS_VAZIOS);

  function aoSair() {
    sair();
    navigate('/painel/login');
  }

  function limparCalculo() {
    setNomePrato('');
    setRendimentoPorcoes('');
    setIngredientes([criarIngredienteVazio()]);
    setEmbalagemPorPorcao('');
    setMaoDeObraTotal('');
    setOutrosCustosDiretos('');
    setDespesasFixas([criarDespesaVazia()]);
    setPorcoesMensais('');
    setPercentuais(PERCENTUAIS_VAZIOS);
  }

  function atualizarIngrediente<Campo extends keyof Ingrediente>(id: string, campo: Campo, valor: Ingrediente[Campo]) {
    setIngredientes((atual) => atual.map((linha) => (linha.id === id ? { ...linha, [campo]: valor } : linha)));
  }

  // Trocar a unidade de compra pode deixar a unidade de uso incompatível
  // (ex.: estava "kg"/"g" e o lojista muda a compra pra "ml") — nesse caso
  // realinha a unidade de uso pro mesmo grupo automaticamente, em vez de
  // deixar uma combinação inválida escondida até o cálculo apontar o erro.
  function atualizarUnidadeCompra(id: string, novaUnidade: UnidadeQuantidade) {
    setIngredientes((atual) =>
      atual.map((linha) => {
        if (linha.id !== id) return linha;
        const compativel = GRUPO_UNIDADE[linha.unidadeUso] === GRUPO_UNIDADE[novaUnidade];
        return { ...linha, unidadeCompra: novaUnidade, unidadeUso: compativel ? linha.unidadeUso : novaUnidade };
      }),
    );
  }

  function adicionarIngrediente() {
    setIngredientes((atual) => [...atual, criarIngredienteVazio()]);
  }

  function removerIngrediente(id: string) {
    setIngredientes((atual) => atual.filter((linha) => linha.id !== id));
  }

  function atualizarDespesa<Campo extends keyof DespesaFixa>(id: string, campo: Campo, valor: DespesaFixa[Campo]) {
    setDespesasFixas((atual) => atual.map((linha) => (linha.id === id ? { ...linha, [campo]: valor } : linha)));
  }

  function adicionarDespesa() {
    setDespesasFixas((atual) => [...atual, criarDespesaVazia()]);
  }

  function removerDespesa(id: string) {
    setDespesasFixas((atual) => atual.filter((linha) => linha.id !== id));
  }

  const resultadosIngredientes = ingredientes.map(calcularCustoIngrediente);
  const resultado = calcularPrecificacao(
    {
      rendimentoPorcoes,
      embalagemPorPorcao,
      maoDeObraTotal,
      outrosCustosDiretos,
      despesasFixas,
      porcoesMensais,
      percentuais,
    },
    resultadosIngredientes,
  );

  return (
    <div className="pagina-painel">
      <header className="painel-cabecalho">
        <div>
          <h1>Painel — Doralina Vegana</h1>
          <p className="painel-cabecalho__usuario">Olá, {usuario?.nome}</p>
        </div>
        <button className="botao-secundario" onClick={aoSair}>
          Sair
        </button>
      </header>

      <nav className="painel-abas">
        <Link to="/painel?aba=dashboard">Dashboard</Link>
        <Link to="/painel?aba=pedidos">Pedidos</Link>
        <Link to="/painel?aba=produtos">Produtos</Link>
        <Link to="/painel?aba=categorias">Categorias</Link>
        <Link to="/painel/precificacao" className="ativa">
          Precificação
        </Link>
      </nav>

      <main className="painel-conteudo">
        <div className="painel-secao">
          <div className="painel-secao__cabecalho">
            <h2>Precificação de pratos</h2>
            <button className="botao-secundario" onClick={limparCalculo}>
              Limpar cálculo
            </button>
          </div>
          <p className="precificacao-aviso">
            Calculadora só neste dispositivo — os dados não são salvos e somem ao sair ou recarregar a página.
          </p>

          <section className="precificacao-grupo">
            <h3>Dados da receita</h3>
            <div className="precificacao-campos">
              <div className="campo">
                <label htmlFor="prato-nome">Nome do prato</label>
                <input
                  id="prato-nome"
                  type="text"
                  value={nomePrato}
                  onChange={(e) => setNomePrato(e.target.value)}
                  placeholder="Ex: Feijoada vegana"
                />
              </div>
              <div className="campo">
                <label htmlFor="prato-rendimento">Rendimento (porções)</label>
                <input
                  id="prato-rendimento"
                  type="text"
                  inputMode="decimal"
                  value={rendimentoPorcoes}
                  onChange={(e) => setRendimentoPorcoes(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>
            </div>
          </section>

          <section className="precificacao-grupo">
            <h3>Ingredientes</h3>
            {ingredientes.length === 0 ? (
              <p className="estado">Nenhum ingrediente adicionado ainda.</p>
            ) : (
              <div className="tabela-painel-wrapper">
                <table className="tabela-painel tabela-precificacao">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Qtd. comprada</th>
                      <th>Unidade</th>
                      <th>Preço pago</th>
                      <th>Qtd. usada</th>
                      <th>Unidade</th>
                      <th>Perda (%)</th>
                      <th>Custo calculado</th>
                      <th aria-label="Remover"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientes.map((linha, indice) => {
                      const res = resultadosIngredientes[indice];
                      const opcoesUsoCompativeis = OPCOES_UNIDADE.filter(
                        (opcao) => GRUPO_UNIDADE[opcao.valor] === GRUPO_UNIDADE[linha.unidadeCompra],
                      );
                      return (
                        <tr key={linha.id}>
                          <td>
                            <input
                              type="text"
                              value={linha.nome}
                              onChange={(e) => atualizarIngrediente(linha.id, 'nome', e.target.value)}
                              placeholder="Ex: Feijão preto"
                              aria-label="Nome do ingrediente"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={linha.quantidadeComprada}
                              onChange={(e) => atualizarIngrediente(linha.id, 'quantidadeComprada', e.target.value)}
                              placeholder="Ex: 1"
                              aria-label="Quantidade comprada"
                            />
                          </td>
                          <td>
                            <select
                              value={linha.unidadeCompra}
                              onChange={(e) => atualizarUnidadeCompra(linha.id, e.target.value as UnidadeQuantidade)}
                              aria-label="Unidade da compra"
                            >
                              {OPCOES_UNIDADE.map((opcao) => (
                                <option key={opcao.valor} value={opcao.valor}>
                                  {opcao.rotulo}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={linha.precoPago}
                              onChange={(e) => atualizarIngrediente(linha.id, 'precoPago', e.target.value)}
                              placeholder="Ex: 8,90"
                              aria-label="Preço pago"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={linha.quantidadeUtilizada}
                              onChange={(e) => atualizarIngrediente(linha.id, 'quantidadeUtilizada', e.target.value)}
                              placeholder="Ex: 250"
                              aria-label="Quantidade utilizada na receita"
                            />
                          </td>
                          <td>
                            <select
                              value={linha.unidadeUso}
                              onChange={(e) => atualizarIngrediente(linha.id, 'unidadeUso', e.target.value as UnidadeQuantidade)}
                              aria-label="Unidade utilizada"
                            >
                              {opcoesUsoCompativeis.map((opcao) => (
                                <option key={opcao.valor} value={opcao.valor}>
                                  {opcao.rotulo}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={linha.percentualPerda}
                              onChange={(e) => atualizarIngrediente(linha.id, 'percentualPerda', e.target.value)}
                              placeholder="0"
                              aria-label="Percentual de perda"
                            />
                          </td>
                          <td className="precificacao__custo-calc">
                            {res.status === 'ok' && formatarPreco(res.custo)}
                            {res.status === 'vazio' && '—'}
                            {res.status === 'erro' && <span className="campo__erro">{res.mensagem}</span>}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="precificacao-remover"
                              aria-label="Remover ingrediente"
                              onClick={() => removerIngrediente(linha.id)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <button type="button" className="botao-secundario" onClick={adicionarIngrediente} style={{ marginTop: '0.75rem' }}>
              + Adicionar ingrediente
            </button>
          </section>

          <section className="precificacao-grupo">
            <h3>Outros custos da receita</h3>
            <div className="precificacao-campos">
              <div className="campo">
                <label htmlFor="prato-embalagem">Embalagem por porção</label>
                <input
                  id="prato-embalagem"
                  type="text"
                  inputMode="decimal"
                  value={embalagemPorPorcao}
                  onChange={(e) => setEmbalagemPorPorcao(e.target.value)}
                  placeholder="Ex: 1,50"
                />
              </div>
              <div className="campo">
                <label htmlFor="prato-mao-de-obra">Mão de obra (total da receita)</label>
                <input
                  id="prato-mao-de-obra"
                  type="text"
                  inputMode="decimal"
                  value={maoDeObraTotal}
                  onChange={(e) => setMaoDeObraTotal(e.target.value)}
                  placeholder="Ex: 25,00"
                />
              </div>
              <div className="campo">
                <label htmlFor="prato-outros-custos">Outros custos diretos (total da receita)</label>
                <input
                  id="prato-outros-custos"
                  type="text"
                  inputMode="decimal"
                  value={outrosCustosDiretos}
                  onChange={(e) => setOutrosCustosDiretos(e.target.value)}
                  placeholder="Ex: 0"
                />
              </div>
            </div>
          </section>

          <section className="precificacao-grupo">
            <h3>Despesas fixas do negócio</h3>
            <div className="precificacao-lista-despesas">
              {despesasFixas.map((despesa) => (
                <div key={despesa.id} className="precificacao-despesa">
                  <input
                    type="text"
                    value={despesa.descricao}
                    onChange={(e) => atualizarDespesa(despesa.id, 'descricao', e.target.value)}
                    placeholder="Ex: Aluguel"
                    aria-label="Descrição da despesa fixa"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={despesa.valorMensal}
                    onChange={(e) => atualizarDespesa(despesa.id, 'valorMensal', e.target.value)}
                    placeholder="Valor mensal"
                    aria-label="Valor mensal da despesa"
                  />
                  <button
                    type="button"
                    className="precificacao-remover"
                    aria-label="Remover despesa fixa"
                    onClick={() => removerDespesa(despesa.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="botao-secundario" onClick={adicionarDespesa} style={{ marginTop: '0.75rem' }}>
              + Adicionar despesa fixa
            </button>

            <div className="precificacao-campos" style={{ marginTop: '1rem' }}>
              <div className="campo">
                <label htmlFor="prato-porcoes-mensais">Porções vendidas por mês (estimativa)</label>
                <input
                  id="prato-porcoes-mensais"
                  type="text"
                  inputMode="decimal"
                  value={porcoesMensais}
                  onChange={(e) => setPorcoesMensais(e.target.value)}
                  placeholder="Ex: 300"
                />
              </div>
            </div>
          </section>

          <section className="precificacao-grupo">
            <h3>Percentuais sobre o preço de venda</h3>
            <div className="precificacao-campos">
              <div className="campo">
                <label htmlFor="perc-impostos">Impostos (%)</label>
                <input
                  id="perc-impostos"
                  type="text"
                  inputMode="decimal"
                  value={percentuais.impostos}
                  onChange={(e) => setPercentuais((atual) => ({ ...atual, impostos: e.target.value }))}
                  placeholder="Ex: 6"
                />
              </div>
              <div className="campo">
                <label htmlFor="perc-taxa-pagamento">Taxa de pagamento (%)</label>
                <input
                  id="perc-taxa-pagamento"
                  type="text"
                  inputMode="decimal"
                  value={percentuais.taxaPagamento}
                  onChange={(e) => setPercentuais((atual) => ({ ...atual, taxaPagamento: e.target.value }))}
                  placeholder="Ex: 3"
                />
              </div>
              <div className="campo">
                <label htmlFor="perc-comissao-delivery">Comissão de delivery (%)</label>
                <input
                  id="perc-comissao-delivery"
                  type="text"
                  inputMode="decimal"
                  value={percentuais.comissaoDelivery}
                  onChange={(e) => setPercentuais((atual) => ({ ...atual, comissaoDelivery: e.target.value }))}
                  placeholder="Ex: 0 (zere se for balcão)"
                />
              </div>
              <div className="campo">
                <label htmlFor="perc-outras-despesas">Outras despesas variáveis (%)</label>
                <input
                  id="perc-outras-despesas"
                  type="text"
                  inputMode="decimal"
                  value={percentuais.outrasDespesasVariaveis}
                  onChange={(e) => setPercentuais((atual) => ({ ...atual, outrasDespesasVariaveis: e.target.value }))}
                  placeholder="Ex: 0"
                />
              </div>
              <div className="campo">
                <label htmlFor="perc-margem">Margem de lucro desejada (%)</label>
                <input
                  id="perc-margem"
                  type="text"
                  inputMode="decimal"
                  value={percentuais.margemDesejada}
                  onChange={(e) => setPercentuais((atual) => ({ ...atual, margemDesejada: e.target.value }))}
                  placeholder="Ex: 20"
                />
              </div>
            </div>
          </section>

          <section className="precificacao-grupo">
            <h3>Resultado</h3>
            {resultado.status === 'incompleto' ? (
              <div className="precificacao-pendencias">
                <strong>Ainda falta informação pra calcular o preço:</strong>
                <ul>
                  {resultado.mensagens.map((mensagem) => (
                    <li key={mensagem}>{mensagem}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="precificacao-resumo">
                <div className="precificacao-resumo__item">
                  <p className="precificacao-resumo__rotulo">Custo da receita (lote todo)</p>
                  <p className="precificacao-resumo__valor">{formatarPreco(resultado.custoReceita)}</p>
                </div>
                <div className="precificacao-resumo__item">
                  <p className="precificacao-resumo__rotulo">Custo direto por porção</p>
                  <p className="precificacao-resumo__valor">{formatarPreco(resultado.custoDiretoPorPorcao)}</p>
                </div>
                <div className="precificacao-resumo__item">
                  <p className="precificacao-resumo__rotulo">Rateio fixo por porção</p>
                  <p className="precificacao-resumo__valor">{formatarPreco(resultado.rateioFixoPorPorcao)}</p>
                </div>
                <div className="precificacao-resumo__item">
                  <p className="precificacao-resumo__rotulo">Custo total por porção</p>
                  <p className="precificacao-resumo__valor">{formatarPreco(resultado.custoTotalPorPorcao)}</p>
                </div>
                <div className="precificacao-resumo__item">
                  <p className="precificacao-resumo__rotulo">Soma dos percentuais</p>
                  <p className="precificacao-resumo__valor">{resultado.somaPercentuais.toFixed(1)}%</p>
                </div>
                <div className="precificacao-resumo__item precificacao-resumo__item--destaque">
                  <p className="precificacao-resumo__rotulo">Preço sugerido</p>
                  <p className="precificacao-resumo__valor">{formatarPreco(resultado.precoSugerido)}</p>
                </div>
                <div className="precificacao-resumo__item">
                  <p className="precificacao-resumo__rotulo">Lucro estimado por porção</p>
                  <p className="precificacao-resumo__valor">{formatarPreco(resultado.lucroPorPorcao)}</p>
                </div>
                <div className="precificacao-resumo__item">
                  <p className="precificacao-resumo__rotulo">Markup</p>
                  <p className="precificacao-resumo__valor">×{resultado.markup.toFixed(2)}</p>
                </div>
                <div className="precificacao-resumo__item">
                  <p className="precificacao-resumo__rotulo">Custo sobre o preço</p>
                  <p className="precificacao-resumo__valor">{resultado.percentualCusto.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
