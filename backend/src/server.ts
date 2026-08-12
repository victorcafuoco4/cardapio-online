import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.routes.js';
import { pedidosRouter } from './routes/pedidos.routes.js';
import { produtosRouter } from './routes/produtos.routes.js';

const app = express();
const PORTA = 3333;

// Em dev, o frontend (Vite) roda em outra porta — precisa de CORS liberado pra chamar a API.
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', mensagem: 'API Cardápio Online no ar' });
});

app.use('/produtos', produtosRouter);
app.use('/pedidos', pedidosRouter);
app.use('/auth', authRouter);

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

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
