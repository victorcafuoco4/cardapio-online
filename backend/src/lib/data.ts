const TZ_LOJA = 'America/Sao_Paulo';

// "YYYY-MM-DD" no fuso da loja — nunca no fuso do processo Node, que em produção
// pode estar rodando em UTC (containers costumam vir assim por padrão). Usa Intl
// com timeZone explícito em vez de getFullYear()/getDate() do objeto Date.
export function chaveDiaFuso(data: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ_LOJA }).format(data);
}

// Início (inclusive) e fim (exclusivo) do dia de "hoje" no fuso da loja, como
// instantes UTC reais — o que dá pra comparar direto com colunas do Postgres.
// Brasil não observa mais horário de verão desde 2019, então -03:00 é seguro
// como offset fixo.
export function limitesDoDia(agora: Date): { inicio: Date; fim: Date } {
  const hoje = chaveDiaFuso(agora);
  const inicio = new Date(`${hoje}T00:00:00-03:00`);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio, fim };
}
