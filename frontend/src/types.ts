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

// Formato pensado já pra bater com o que a API de pedidos (próxima etapa) vai esperar.
export type DadosPedido = {
  nomeCliente: string;
  telefone: string;
  tipoEntrega: TipoEntrega;
  endereco?: string;
  formaPagamento: FormaPagamento;
  trocoPara?: string;
  observacoes?: string;
};

export type PedidoFinalizado = {
  itens: ItemCarrinho[];
  total: number;
  dados: DadosPedido;
};
