import 'dotenv/config';
import { app } from './app.js';

const PORTA = process.env.PORT ? Number(process.env.PORT) : 3333;

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
