import { prisma } from '../src/lib/prisma.js';

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
      },
      {
        nome: 'Estrogonofe de Cogumelos',
        descricao: 'Cogumelos paris e shimeji ao molho cremoso vegano, servido com arroz e batata palha.',
        preco: 36.9,
        foto: 'https://placehold.co/300x200',
      },
      {
        nome: 'Lasanha de Berinjela',
        descricao: 'Camadas de berinjela grelhada, molho bolonhesa de soja e "queijo" vegano gratinado.',
        preco: 34.9,
        foto: 'https://placehold.co/300x200',
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
      },
      {
        nome: 'Wrap de Grão-de-Bico',
        descricao: 'Tortilha integral, homus, rúcula, cenoura ralada e picles.',
        preco: 24.9,
        foto: 'https://placehold.co/300x200',
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
      },
      {
        nome: 'Mousse de Chocolate com Abacate',
        descricao: 'Cremoso, sem lactose, adoçado com tâmaras.',
        preco: 14.9,
        foto: 'https://placehold.co/300x200',
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
      },
      {
        nome: 'Água de Coco Natural',
        descricao: '300ml, gelada.',
        preco: 8.0,
        foto: 'https://placehold.co/300x200',
      },
    ],
  },
];

async function main() {
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
