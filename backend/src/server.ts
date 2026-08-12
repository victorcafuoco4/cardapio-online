import express from 'express';

const app = express();
const PORTA = 3333;

app.get('/', (req, res) => {
  res.json({ status: 'ok', mensagem: 'API Cardápio Online no ar' });
});

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
