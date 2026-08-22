// Garante que existe um banco Postgres local separado ("cardapio_test") pros
// testes automatizados, e aplica as migrations nele. Nunca toca no banco de dev
// (cardapio) nem em nenhum banco remoto — só lê a URL do .env pra descobrir o
// host/porta/credenciais do mesmo servidor Postgres local e troca o nome do banco.
// Rodado automaticamente antes de `npm test` (ver "pretest" no package.json).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const raizBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOME_BANCO_TESTE = 'cardapio_test';

function lerDatabaseUrlDev(): string {
  const conteudo = readFileSync(path.join(raizBackend, '.env'), 'utf-8');
  const linha = conteudo.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!linha) throw new Error('DATABASE_URL não encontrada em backend/.env');
  return linha
    .slice('DATABASE_URL='.length)
    .trim()
    .replace(/^["']|["']$/g, '');
}

function trocarNomeDoBanco(url: string, novoNome: string): string {
  return url.replace(/\/([a-zA-Z0-9_-]+)(\?.*)?$/, `/${novoNome}$2`);
}

async function main() {
  const urlDev = lerDatabaseUrlDev();
  const urlManutencao = trocarNomeDoBanco(urlDev, 'postgres');
  const urlTeste = trocarNomeDoBanco(urlDev, NOME_BANCO_TESTE);

  const client = new Client({ connectionString: urlManutencao });
  await client.connect();
  const existe = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [NOME_BANCO_TESTE]);
  if (existe.rowCount === 0) {
    // NOME_BANCO_TESTE é uma constante fixa acima, não entrada externa — CREATE
    // DATABASE não aceita identificador como parâmetro do driver, por isso o
    // template literal aqui é seguro.
    await client.query(`CREATE DATABASE ${NOME_BANCO_TESTE}`);
    console.log(`Banco de teste "${NOME_BANCO_TESTE}" criado.`);
  }
  await client.end();

  execSync('npx prisma migrate deploy', {
    cwd: raizBackend,
    env: { ...process.env, DATABASE_URL: urlTeste },
    stdio: 'inherit',
  });
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
