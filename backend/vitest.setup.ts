import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raizBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function lerDatabaseUrlDev(): string {
  const conteudo = readFileSync(path.join(raizBackend, '.env'), 'utf-8');
  const linha = conteudo.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!linha) throw new Error('DATABASE_URL não encontrada em backend/.env');
  return linha
    .slice('DATABASE_URL='.length)
    .trim()
    .replace(/^["']|["']$/g, '');
}

// Testes nunca usam o banco de dev nem qualquer banco remoto — sempre o banco
// local separado "cardapio_test", preparado por scripts/prepararBancoTeste.ts.
process.env.DATABASE_URL = lerDatabaseUrlDev().replace(/\/([a-zA-Z0-9_-]+)(\?.*)?$/, '/cardapio_test$2');
process.env.JWT_SECRET = 'segredo-de-teste-nao-usar-em-producao';
