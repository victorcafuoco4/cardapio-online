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
