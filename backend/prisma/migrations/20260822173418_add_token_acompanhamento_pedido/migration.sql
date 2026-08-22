-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "tokenAcompanhamento" UUID NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_tokenAcompanhamento_key" ON "pedidos"("tokenAcompanhamento");
