import { prisma } from '../src/lib/prisma.js';

// Backfill único pros pedidos ENTREGUE que existiam antes do campo entregueEm.
// Aproximação combinada com o usuário: usa atualizadoEm (data do último PATCH
// de status) como data de entrega, por ser o melhor dado disponível pra esses
// registros legados — não é a data real de entrega, é a menos-pior aproximação.
// Só toca pedidos ENTREGUE com entregueEm ainda null; idempotente, pode rodar
// mais de uma vez sem efeito colateral.
async function main() {
  const pedidos = await prisma.pedido.findMany({
    where: { status: 'ENTREGUE', entregueEm: null },
    select: { id: true, atualizadoEm: true },
  });

  console.log(`${pedidos.length} pedido(s) ENTREGUE sem entregueEm encontrado(s).`);

  for (const pedido of pedidos) {
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { entregueEm: pedido.atualizadoEm },
    });
    console.log(`  pedido #${pedido.id}: entregueEm = ${pedido.atualizadoEm.toISOString()}`);
  }

  console.log('Backfill concluído.');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
