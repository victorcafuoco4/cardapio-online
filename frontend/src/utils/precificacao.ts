// Motor de cálculo da calculadora de precificação de pratos (Etapa MVP —
// só frontend, nada é salvo). Funções puras, sem React, pra ficarem fáceis
// de ler e de testar isoladamente no futuro.

export type UnidadeQuantidade = 'g' | 'kg' | 'ml' | 'L' | 'unidade';

// Só se pode converter dentro do mesmo grupo (g↔kg, ml↔L) — "unidade" nunca
// converte pra massa/volume, por isso fica no próprio grupo.
export const GRUPO_UNIDADE: Record<UnidadeQuantidade, 'massa' | 'volume' | 'unidade'> = {
  g: 'massa',
  kg: 'massa',
  ml: 'volume',
  L: 'volume',
  unidade: 'unidade',
};

// Fator pra converter cada unidade pra uma unidade-base do seu grupo
// (grama pra massa, mililitro pra volume) — é isso que faz g↔kg e ml↔L
// converterem automaticamente sem o usuário precisar fazer conta.
const FATOR_PARA_BASE: Record<UnidadeQuantidade, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  L: 1000,
  unidade: 1,
};

export const OPCOES_UNIDADE: { valor: UnidadeQuantidade; rotulo: string }[] = [
  { valor: 'g', rotulo: 'g' },
  { valor: 'kg', rotulo: 'kg' },
  { valor: 'ml', rotulo: 'ml' },
  { valor: 'L', rotulo: 'L' },
  { valor: 'unidade', rotulo: 'unidade' },
];

export type Ingrediente = {
  id: string;
  nome: string;
  quantidadeComprada: string;
  unidadeCompra: UnidadeQuantidade;
  precoPago: string;
  quantidadeUtilizada: string;
  unidadeUso: UnidadeQuantidade;
  percentualPerda: string;
};

export type DespesaFixa = {
  id: string;
  descricao: string;
  valorMensal: string;
};

export type PercentuaisPreco = {
  impostos: string;
  taxaPagamento: string;
  comissaoDelivery: string;
  outrasDespesasVariaveis: string;
  margemDesejada: string;
};

export type EntradaPrecificacao = {
  rendimentoPorcoes: string;
  embalagemPorPorcao: string;
  maoDeObraTotal: string;
  outrosCustosDiretos: string;
  despesasFixas: DespesaFixa[];
  porcoesMensais: string;
  percentuais: PercentuaisPreco;
};

export type ResultadoLinhaIngrediente =
  | { status: 'vazio' }
  | { status: 'erro'; mensagem: string }
  | { status: 'ok'; custo: number };

export type ResultadoPrecificacao =
  | { status: 'incompleto'; mensagens: string[] }
  | {
      status: 'ok';
      custoReceita: number;
      custoDiretoPorPorcao: number;
      rateioFixoPorPorcao: number;
      custoTotalPorPorcao: number;
      somaPercentuais: number;
      precoSugerido: number;
      lucroPorPorcao: number;
      markup: number;
      percentualCusto: number;
    };

let proximoId = 0;

// Gera um id só local, pra key do React e pra identificar a linha ao editar —
// nunca é enviado a lugar nenhum, é descartado com o resto do estado da página.
export function criarId(prefixo: string): string {
  proximoId += 1;
  return `${prefixo}-${proximoId}`;
}

export function criarIngredienteVazio(): Ingrediente {
  return {
    id: criarId('ingrediente'),
    nome: '',
    quantidadeComprada: '',
    unidadeCompra: 'kg',
    precoPago: '',
    quantidadeUtilizada: '',
    unidadeUso: 'g',
    percentualPerda: '',
  };
}

export function criarDespesaVazia(): DespesaFixa {
  return { id: criarId('despesa'), descricao: '', valorMensal: '' };
}

// Converte texto de input em número, aceitando os dois formatos que um
// lojista brasileiro digita naturalmente:
//   - com vírgula decimal ("1.234,56", "8,90") — ponto(s) antes da vírgula
//     são sempre separador de milhar e são descartados;
//   - só com ponto, sem vírgula ("1.000", "8.90") — aí o ponto é ambíguo:
//     pode ser separador de milhar ("1.000" = mil) ou decimal ("8.90" = 8,90).
//     Resolve pela forma: mais de um ponto, ou um ponto seguido de exatamente
//     3 dígitos, é tratado como separador de milhar (ninguém digita "1.000"
//     querendo dizer "1"); qualquer outro caso (ex.: "8.90", "8.5") é decimal.
// null = campo vazio (ainda não preenchido, não é erro); NaN = foi digitado
// algo que não é um número válido (é erro).
function paraNumero(texto: string): number | null {
  const limpo = texto.trim();
  if (limpo === '') return null;

  let normalizado: string;
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  } else {
    const quantidadeDePontos = (limpo.match(/\./g) ?? []).length;
    const pontoUnicoDeMilhar = quantidadeDePontos === 1 && /\.\d{3}$/.test(limpo);
    normalizado = quantidadeDePontos > 1 || pontoUnicoDeMilhar ? limpo.replace(/\./g, '') : limpo;
  }

  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : NaN;
}

// Ingrediente ajustado pela perda: custo ajustado = custo base ÷ (1 − perda/100).
export function calcularCustoIngrediente(ingrediente: Ingrediente): ResultadoLinhaIngrediente {
  const quantidadeComprada = paraNumero(ingrediente.quantidadeComprada);
  const precoPago = paraNumero(ingrediente.precoPago);
  const quantidadeUtilizada = paraNumero(ingrediente.quantidadeUtilizada);
  const percentualPerda = paraNumero(ingrediente.percentualPerda);

  // Linha recém-criada, ainda sem nenhum número digitado — não é erro, só
  // não tem o que calcular ainda.
  if (quantidadeComprada === null && precoPago === null && quantidadeUtilizada === null) {
    return { status: 'vazio' };
  }

  if (quantidadeComprada === null || Number.isNaN(quantidadeComprada) || quantidadeComprada <= 0) {
    return { status: 'erro', mensagem: 'Quantidade comprada precisa ser maior que zero.' };
  }
  if (precoPago === null || Number.isNaN(precoPago) || precoPago < 0) {
    return { status: 'erro', mensagem: 'Preço pago não pode ficar em branco nem ser negativo.' };
  }
  if (quantidadeUtilizada === null || Number.isNaN(quantidadeUtilizada) || quantidadeUtilizada < 0) {
    return { status: 'erro', mensagem: 'Quantidade utilizada não pode ficar em branco nem ser negativa.' };
  }
  const perda = percentualPerda === null ? 0 : percentualPerda;
  if (Number.isNaN(perda) || perda < 0 || perda >= 100) {
    return { status: 'erro', mensagem: 'Perda precisa ser um percentual entre 0 e 99,9%.' };
  }
  if (GRUPO_UNIDADE[ingrediente.unidadeCompra] !== GRUPO_UNIDADE[ingrediente.unidadeUso]) {
    return { status: 'erro', mensagem: 'Unidades incompatíveis: combine g com kg, ml com L, ou unidade com unidade.' };
  }

  const custoPorUnidadeBase = precoPago / (quantidadeComprada * FATOR_PARA_BASE[ingrediente.unidadeCompra]);
  const custoBase = custoPorUnidadeBase * (quantidadeUtilizada * FATOR_PARA_BASE[ingrediente.unidadeUso]);
  const custoAjustado = custoBase / (1 - perda / 100);

  if (!Number.isFinite(custoAjustado)) {
    return { status: 'erro', mensagem: 'Não foi possível calcular o custo deste ingrediente.' };
  }

  return { status: 'ok', custo: custoAjustado };
}

// Campo numérico opcional e não-negativo: em branco vira 0 (sem erro); qualquer
// coisa negativa ou não-numérica gera mensagem e invalida o cálculo final.
function validarNaoNegativo(texto: string, rotulo: string, mensagens: string[]): number | null {
  const valor = paraNumero(texto);
  if (valor === null) return 0;
  if (Number.isNaN(valor) || valor < 0) {
    mensagens.push(`${rotulo}: informe um valor válido, não negativo.`);
    return null;
  }
  return valor;
}

const ROTULO_PERCENTUAL: Record<keyof PercentuaisPreco, string> = {
  impostos: 'Impostos',
  taxaPagamento: 'Taxa de pagamento',
  comissaoDelivery: 'Comissão de delivery',
  outrasDespesasVariaveis: 'Outras despesas variáveis',
  margemDesejada: 'Margem de lucro desejada',
};

function validarPercentuais(
  percentuais: PercentuaisPreco,
  mensagens: string[],
): Record<keyof PercentuaisPreco, number> | null {
  const chaves = Object.keys(percentuais) as (keyof PercentuaisPreco)[];
  const resultado = {} as Record<keyof PercentuaisPreco, number>;
  let valido = true;

  for (const chave of chaves) {
    const valor = paraNumero(percentuais[chave]);
    const numero = valor === null ? 0 : valor;
    if (Number.isNaN(numero) || numero < 0) {
      mensagens.push(`${ROTULO_PERCENTUAL[chave]}: informe um percentual válido, não negativo.`);
      valido = false;
      continue;
    }
    resultado[chave] = numero;
  }

  return valido ? resultado : null;
}

// Junta ingredientes + outros custos + rateio fixo num preço sugerido, usando
// a fórmula do divisor: como impostos, taxa de pagamento, comissão de delivery
// e margem incidem sobre o PREÇO de venda (não sobre o custo), o preço tem que
// resolver preço = custo + preço × soma(percentuais/100), ou seja:
//   preço sugerido = custo total por porção ÷ (1 − soma dos percentuais/100)
export function calcularPrecificacao(
  entrada: EntradaPrecificacao,
  resultadosIngredientes: ResultadoLinhaIngrediente[],
): ResultadoPrecificacao {
  const mensagens: string[] = [];

  const rendimento = paraNumero(entrada.rendimentoPorcoes);
  if (rendimento === null || Number.isNaN(rendimento) || rendimento <= 0) {
    mensagens.push('Informe o rendimento em porções (maior que zero).');
  }

  if (resultadosIngredientes.some((linha) => linha.status === 'erro')) {
    mensagens.push('Corrija os ingredientes com erro antes de calcular o total.');
  }

  const embalagem = validarNaoNegativo(entrada.embalagemPorPorcao, 'Embalagem por porção', mensagens);
  const maoDeObra = validarNaoNegativo(entrada.maoDeObraTotal, 'Mão de obra', mensagens);
  const outrosCustos = validarNaoNegativo(entrada.outrosCustosDiretos, 'Outros custos diretos', mensagens);
  const porcoesMensais = validarNaoNegativo(entrada.porcoesMensais, 'Porções vendidas por mês', mensagens);

  let despesasFixasTotal = 0;
  for (const despesa of entrada.despesasFixas) {
    const valor = paraNumero(despesa.valorMensal);
    if (valor === null) continue;
    if (Number.isNaN(valor) || valor < 0) {
      mensagens.push(`Despesa fixa "${despesa.descricao.trim() || 'sem nome'}": informe um valor válido, não negativo.`);
      continue;
    }
    despesasFixasTotal += valor;
  }

  if (despesasFixasTotal > 0 && (porcoesMensais === null || porcoesMensais <= 0)) {
    mensagens.push('Para ratear as despesas fixas, informe as porções vendidas por mês (maior que zero).');
  }

  const percentuaisNums = validarPercentuais(entrada.percentuais, mensagens);

  if (
    mensagens.length > 0 ||
    rendimento === null ||
    embalagem === null ||
    maoDeObra === null ||
    outrosCustos === null ||
    percentuaisNums === null
  ) {
    return { status: 'incompleto', mensagens };
  }

  const somaPercentuais =
    percentuaisNums.impostos +
    percentuaisNums.taxaPagamento +
    percentuaisNums.comissaoDelivery +
    percentuaisNums.outrasDespesasVariaveis +
    percentuaisNums.margemDesejada;

  if (somaPercentuais >= 100) {
    return {
      status: 'incompleto',
      mensagens: [`A soma dos percentuais precisa ser menor que 100% — hoje está em ${somaPercentuais.toFixed(1)}%.`],
    };
  }

  const custoReceita = resultadosIngredientes.reduce(
    (soma, linha) => soma + (linha.status === 'ok' ? linha.custo : 0),
    0,
  );
  const custoIngredientesPorPorcao = custoReceita / rendimento;
  const custoDiretoPorPorcao = custoIngredientesPorPorcao + embalagem + maoDeObra / rendimento + outrosCustos / rendimento;

  const rateioFixoPorPorcao = despesasFixasTotal > 0 ? despesasFixasTotal / (porcoesMensais as number) : 0;
  const custoTotalPorPorcao = custoDiretoPorPorcao + rateioFixoPorPorcao;

  const precoSugerido = custoTotalPorPorcao / (1 - somaPercentuais / 100);

  if (!Number.isFinite(precoSugerido) || !Number.isFinite(custoTotalPorPorcao)) {
    return { status: 'incompleto', mensagens: ['Não foi possível calcular o preço com os valores informados.'] };
  }

  // Por construção da fórmula do divisor, a margem desejada É a fatia do preço
  // que sobra como lucro — por isso calcular assim bate com "preço − custo −
  // impostos − taxas − comissão", sem precisar repetir a subtração.
  const lucroPorPorcao = precoSugerido * (percentuaisNums.margemDesejada / 100);
  const markup = custoTotalPorPorcao > 0 ? precoSugerido / custoTotalPorPorcao : 0;
  const percentualCusto = precoSugerido > 0 ? (custoTotalPorPorcao / precoSugerido) * 100 : 0;

  return {
    status: 'ok',
    custoReceita,
    custoDiretoPorPorcao,
    rateioFixoPorPorcao,
    custoTotalPorPorcao,
    somaPercentuais,
    precoSugerido,
    lucroPorPorcao,
    markup,
    percentualCusto,
  };
}
