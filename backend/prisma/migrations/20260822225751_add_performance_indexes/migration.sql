-- CreateIndex
CREATE INDEX "itens_pedido_pedidoId_idx" ON "itens_pedido"("pedidoId");

-- CreateIndex
CREATE INDEX "itens_pedido_produtoId_idx" ON "itens_pedido"("produtoId");

-- CreateIndex
CREATE INDEX "pedidos_criadoEm_idx" ON "pedidos"("criadoEm");

-- CreateIndex
CREATE INDEX "produtos_categoriaId_ordem_idx" ON "produtos"("categoriaId", "ordem");
