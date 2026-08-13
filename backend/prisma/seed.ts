import bcrypt from 'bcrypt';
import { Prisma } from '../src/generated/prisma/client.js';
import { prisma } from '../src/lib/prisma.js';

// Credenciais de demonstração — só pra ambiente de dev, documentadas no README.
const LOJISTA_DEMO = {
  nome: 'Dona Doralina',
  email: 'dona@doralinavegana.com.br',
  senha: 'doralina123',
};

const categorias = [
  {
    nome: 'Pratos Principais',
    ordem: 1,
    produtos: [
      {
        nome: 'Bowl de Grão-de-Bico com Legumes Grelhados',
        descricao: 'Grão-de-bico temperado, abobrinha, berinjela e molho tahine.',
        preco: 32.9,
        foto: 'https://placehold.co/300x200',
        estoque: 20,
      },
      {
        nome: 'Estrogonofe de Cogumelos',
        descricao: 'Cogumelos paris e shimeji ao molho cremoso vegano, servido com arroz e batata palha.',
        preco: 36.9,
        foto: 'https://placehold.co/300x200',
        estoque: 15,
      },
      {
        nome: 'Lasanha de Berinjela',
        descricao: 'Camadas de berinjela grelhada, molho bolonhesa de soja e "queijo" vegano gratinado.',
        preco: 34.9,
        foto: 'https://placehold.co/300x200',
        estoque: 10,
      },
    ],
  },
  {
    nome: 'Lanches',
    ordem: 2,
    produtos: [
      {
        nome: 'Burger de Feijão Preto',
        descricao: 'Hambúrguer de feijão preto e quinoa, alface, tomate e maionese vegana no pão brioche.',
        preco: 28.9,
        foto: 'https://placehold.co/300x200',
        estoque: 25,
      },
      {
        nome: 'Wrap de Grão-de-Bico',
        descricao: 'Tortilha integral, homus, rúcula, cenoura ralada e picles.',
        preco: 24.9,
        foto: 'https://placehold.co/300x200',
        estoque: 18,
      },
    ],
  },
  {
    nome: 'Sobremesas',
    ordem: 3,
    produtos: [
      {
        nome: 'Brownie Vegano com Sorvete',
        descricao: 'Brownie de cacau 70% com sorvete de coco.',
        preco: 18.9,
        foto: 'https://placehold.co/300x200',
        estoque: 12,
      },
      {
        nome: 'Mousse de Chocolate com Abacate',
        descricao: 'Cremoso, sem lactose, adoçado com tâmaras.',
        preco: 14.9,
        foto: 'https://placehold.co/300x200',
        // Zerado de propósito, pra demonstrar o estado "esgotado" no cardápio.
        estoque: 0,
      },
    ],
  },
  {
    nome: 'Bebidas',
    ordem: 4,
    produtos: [
      {
        nome: 'Suco Verde Detox',
        descricao: 'Couve, maçã, gengibre e limão.',
        preco: 12.0,
        foto: 'https://placehold.co/300x200',
        estoque: 30,
      },
      {
        nome: 'Água de Coco Natural',
        descricao: '300ml, gelada.',
        preco: 8.0,
        foto: 'https://placehold.co/300x200',
        estoque: 3,
      },
    ],
  },
];

type ItemPedidoDemo = { produto: string; quantidade: number };

type PedidoDemo = {
  diasAtras: number;
  hora: number;
  nomeCliente: string;
  telefone: string;
  tipoEntrega: 'RETIRADA' | 'ENTREGA';
  endereco?: string;
  formaPagamento: 'DINHEIRO' | 'CARTAO' | 'PIX';
  status: 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';
  itens: ItemPedidoDemo[];
};

// Pedidos de exemplo espalhados pelos últimos 14 dias, pra o dashboard (Etapa 14)
// já vir com dado real pra mostrar assim que o seed roda. Datas em "diasAtras"
// (relativas a agora) — sempre caem dentro da janela do gráfico de faturamento diário.
const PEDIDOS_DEMO: PedidoDemo[] = [
  {
    diasAtras: 13,
    hora: 12,
    nomeCliente: 'Ana Beatriz',
    telefone: '11987650001',
    tipoEntrega: 'RETIRADA',
    formaPagamento: 'PIX',
    status: 'ENTREGUE',
    itens: [
      { produto: 'Bowl de Grão-de-Bico com Legumes Grelhados', quantidade: 2 },
      { produto: 'Suco Verde Detox', quantidade: 1 },
    ],
  },
  {
    diasAtras: 11,
    hora: 19,
    nomeCliente: 'Carlos Eduardo',
    telefone: '11987650002',
    tipoEntrega: 'ENTREGA',
    endereco: 'Rua das Palmeiras, 120',
    formaPagamento: 'CARTAO',
    status: 'ENTREGUE',
    itens: [{ produto: 'Burger de Feijão Preto', quantidade: 3 }],
  },
  {
    diasAtras: 9,
    hora: 13,
    nomeCliente: 'Fernanda Lima',
    telefone: '11987650003',
    tipoEntrega: 'RETIRADA',
    formaPagamento: 'DINHEIRO',
    status: 'ENTREGUE',
    itens: [
      { produto: 'Lasanha de Berinjela', quantidade: 1 },
      { produto: 'Brownie Vegano com Sorvete', quantidade: 2 },
    ],
  },
  {
    diasAtras: 7,
    hora: 20,
    nomeCliente: 'Rafael Souza',
    telefone: '11987650004',
    tipoEntrega: 'ENTREGA',
    endereco: 'Av. Brasil, 500, apto 12',
    formaPagamento: 'PIX',
    status: 'ENTREGUE',
    itens: [{ produto: 'Wrap de Grão-de-Bico', quantidade: 2 }],
  },
  {
    diasAtras: 6,
    hora: 12,
    nomeCliente: 'Juliana Alves',
    telefone: '11987650005',
    tipoEntrega: 'RETIRADA',
    formaPagamento: 'PIX',
    status: 'CANCELADO',
    itens: [{ produto: 'Estrogonofe de Cogumelos', quantidade: 1 }],
  },
  {
    diasAtras: 5,
    hora: 18,
    nomeCliente: 'Bruno Martins',
    telefone: '11987650006',
    tipoEntrega: 'RETIRADA',
    formaPagamento: 'CARTAO',
    status: 'ENTREGUE',
    itens: [
      { produto: 'Bowl de Grão-de-Bico com Legumes Grelhados', quantidade: 1 },
      { produto: 'Água de Coco Natural', quantidade: 2 },
    ],
  },
  {
    diasAtras: 3,
    hora: 13,
    nomeCliente: 'Patrícia Gomes',
    telefone: '11987650007',
    tipoEntrega: 'ENTREGA',
    endereco: 'Rua dos Ipês, 45',
    formaPagamento: 'DINHEIRO',
    status: 'ENTREGUE',
    itens: [
      { produto: 'Burger de Feijão Preto', quantidade: 2 },
      { produto: 'Suco Verde Detox', quantidade: 1 },
    ],
  },
  {
    diasAtras: 2,
    hora: 19,
    nomeCliente: 'Diego Fernandes',
    telefone: '11987650008',
    tipoEntrega: 'RETIRADA',
    formaPagamento: 'PIX',
    status: 'EM_PREPARO',
    itens: [{ produto: 'Lasanha de Berinjela', quantidade: 2 }],
  },
  {
    diasAtras: 1,
    hora: 12,
    nomeCliente: 'Camila Rocha',
    telefone: '11987650009',
    tipoEntrega: 'RETIRADA',
    formaPagamento: 'PIX',
    status: 'PRONTO',
    itens: [
      { produto: 'Wrap de Grão-de-Bico', quantidade: 1 },
      { produto: 'Brownie Vegano com Sorvete', quantidade: 1 },
    ],
  },
  {
    diasAtras: 0,
    hora: 12,
    nomeCliente: 'Lucas Pereira',
    telefone: '11987650010',
    tipoEntrega: 'ENTREGA',
    endereco: 'Rua Nova, 8',
    formaPagamento: 'CARTAO',
    status: 'RECEBIDO',
    itens: [{ produto: 'Bowl de Grão-de-Bico com Legumes Grelhados', quantidade: 3 }],
  },
];

async function main() {
  // upsert (não delete+create) pro usuário demo: senha continua valendo entre execuções do seed.
  const senhaHash = await bcrypt.hash(LOJISTA_DEMO.senha, 10);
  await prisma.usuario.upsert({
    where: { email: LOJISTA_DEMO.email },
    update: { nome: LOJISTA_DEMO.nome, senhaHash },
    create: { nome: LOJISTA_DEMO.nome, email: LOJISTA_DEMO.email, senhaHash },
  });

  // Limpa antes de semear, para o seed poder ser rodado várias vezes sem duplicar dados.
  // Pedidos referenciam produtos por FK, então precisam ser limpos primeiro.
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.categoria.deleteMany();

  for (const { produtos, ...categoria } of categorias) {
    await prisma.categoria.create({
      data: {
        ...categoria,
        produtos: {
          create: produtos.map((produto, indice) => ({ ...produto, ordem: indice + 1 })),
        },
      },
    });
  }

  const produtosCriados = await prisma.produto.findMany();
  function buscarProduto(nome: string) {
    const produto = produtosCriados.find((p) => p.nome === nome);
    if (!produto) throw new Error(`produto de demonstração não encontrado: ${nome}`);
    return produto;
  }

  const agora = new Date();
  for (const pedidoDemo of PEDIDOS_DEMO) {
    const criadoEm = new Date(agora);
    criadoEm.setDate(criadoEm.getDate() - pedidoDemo.diasAtras);
    criadoEm.setHours(pedidoDemo.hora, 0, 0, 0);

    const itensComPreco = pedidoDemo.itens.map(({ produto: nomeProduto, quantidade }) => {
      const produto = buscarProduto(nomeProduto);
      return { produtoId: produto.id, quantidade, precoUnitario: produto.preco };
    });
    const total = itensComPreco.reduce(
      (acumulado, item) => acumulado.plus(item.precoUnitario.times(item.quantidade)),
      new Prisma.Decimal(0),
    );

    await prisma.pedido.create({
      data: {
        nomeCliente: pedidoDemo.nomeCliente,
        telefone: pedidoDemo.telefone,
        tipoEntrega: pedidoDemo.tipoEntrega,
        endereco: pedidoDemo.endereco,
        formaPagamento: pedidoDemo.formaPagamento,
        status: pedidoDemo.status,
        total,
        criadoEm,
        atualizadoEm: criadoEm,
        itens: { create: itensComPreco },
      },
    });
  }

  console.log('Seed concluído: Doralina Vegana carregada no banco.');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
