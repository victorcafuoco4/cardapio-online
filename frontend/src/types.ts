export type Categoria = {
  id: number;
  nome: string;
  ordem: number;
};

export type Produto = {
  id: number;
  nome: string;
  descricao: string;
  // Vem como string da API: o Prisma serializa campos Decimal assim pra não perder precisão.
  preco: string;
  foto: string;
  ordem: number;
  estoque: number;
  disponivel: boolean;
  categoriaId: number;
  categoria: Categoria;
};

export type ItemCarrinho = Produto & {
  quantidade: number;
};

export type TipoEntrega = 'retirada' | 'entrega';
export type FormaPagamento = 'dinheiro' | 'cartao' | 'pix';

// Dados coletados no formulário de checkout, no formato "de UI" (minúsculo).
export type DadosPedido = {
  nomeCliente: string;
  telefone: string;
  tipoEntrega: TipoEntrega;
  endereco?: string;
  formaPagamento: FormaPagamento;
  trocoPara?: string;
  observacoes?: string;
};

export type StatusPedido = 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';

export type ItemPedidoResposta = {
  id: number;
  produtoId: number;
  quantidade: number;
  precoUnitario: string;
  produto: Produto;
};

// Formato devolvido pela API (POST/GET /pedidos) — enums em maiúsculo, como no banco.
// Só aparece pra quem já tem os dados (quem acabou de criar o pedido, ou o painel
// autenticado do lojista) — nunca é o formato da rota pública de acompanhamento.
export type PedidoResposta = {
  id: number;
  tokenAcompanhamento: string;
  nomeCliente: string;
  telefone: string;
  tipoEntrega: 'RETIRADA' | 'ENTREGA';
  endereco: string | null;
  formaPagamento: 'DINHEIRO' | 'CARTAO' | 'PIX';
  trocoPara: string | null;
  observacoes: string | null;
  status: StatusPedido;
  total: string;
  criadoEm: string;
  itens: ItemPedidoResposta[];
};

// Item de pedido no formato mínimo devolvido pela rota pública de acompanhamento —
// sem id interno, só o necessário pra exibir a lista de itens.
export type ItemPedidoPublico = {
  quantidade: number;
  precoUnitario: string;
  produto: { nome: string };
};

// Formato devolvido por GET /pedidos/acompanhar/:token — deliberadamente mínimo,
// sem id interno nem nenhum dado pessoal do cliente (nome, telefone, endereço,
// observações). Ver backend/src/routes/pedidos.routes.ts.
export type PedidoPublico = {
  status: StatusPedido;
  tipoEntrega: 'RETIRADA' | 'ENTREGA';
  total: string;
  criadoEm: string;
  entregueEm: string | null;
  itens: ItemPedidoPublico[];
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
};

export type RespostaLogin = {
  token: string;
  usuario: Usuario;
};

export type ProdutoMaisVendido = {
  nome: string;
  quantidade: number;
  receita: string;
};

export type FaturamentoDia = {
  data: string;
  total: string;
};

export type ResumoDashboard = {
  vendasHoje: number;
  faturamentoHoje: string;
  pedidosEmAberto: number;
  ticketMedioHoje: string;
  totalPedidos: number;
  faturamentoTotal: string;
  ticketMedio: string;
  pedidosPorStatus: Record<StatusPedido, number>;
  faturamentoPorFormaPagamento: Record<'DINHEIRO' | 'CARTAO' | 'PIX', string>;
  produtosMaisVendidos: ProdutoMaisVendido[];
  faturamentoPorDia: FaturamentoDia[];
};
