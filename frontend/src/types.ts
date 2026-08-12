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
export type PedidoResposta = {
  id: number;
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
