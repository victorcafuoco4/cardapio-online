import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.routes.js';
import { categoriasRouter } from './routes/categorias.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { pedidosRouter } from './routes/pedidos.routes.js';
import { produtosRouter } from './routes/produtos.routes.js';

export const app = express();

// Em dev (sem CORS_ORIGIN configurado), libera geral — o frontend roda em outra porta.
// Em produção, CORS_ORIGIN restringe às origens do frontend hospedado (separadas por vírgula).
const origensPermitidas = process.env.CORS_ORIGIN?.split(',').map((origem) => origem.trim());
app.use(cors({ origin: origensPermitidas ?? true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', mensagem: 'API Cardápio Online no ar' });
});

app.use('/produtos', produtosRouter);
app.use('/categorias', categoriasRouter);
app.use('/pedidos', pedidosRouter);
app.use('/auth', authRouter);
app.use('/dashboard', dashboardRouter);

// Middleware de erro: Express 5 encaminha automaticamente exceções e promises
// rejeitadas das rotas assíncronas pra cá. Erros "esperados" do próprio Express
// (como JSON malformado no corpo) já vêm com statusCode e devem manter esse código.
app.use((erro: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(erro);

  if (erro && typeof erro === 'object' && 'statusCode' in erro && 'expose' in erro && erro.expose) {
    const statusCode = erro.statusCode as number;
    res.status(statusCode).json({ erro: 'corpo da requisição inválido' });
    return;
  }

  res.status(500).json({ erro: 'erro interno do servidor' });
});
