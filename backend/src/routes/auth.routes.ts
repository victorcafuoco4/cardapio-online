import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { autenticar, JWT_SECRET } from '../middleware/autenticar.js';
import type { PayloadToken } from '../middleware/autenticar.js';

export const authRouter = Router();

// POST /auth/login
authRouter.post('/login', async (req, res) => {
  const { email, senha } = req.body ?? {};

  if (typeof email !== 'string' || typeof senha !== 'string' || !email.trim() || !senha.trim()) {
    res.status(400).json({ erro: 'email e senha são obrigatórios' });
    return;
  }

  // Mensagem sempre igual pra não vazar se o email existe ou não na base.
  const credenciaisInvalidas = () => res.status(401).json({ erro: 'email ou senha inválidos' });

  const usuario = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!usuario) {
    credenciaisInvalidas();
    return;
  }

  const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaConfere) {
    credenciaisInvalidas();
    return;
  }

  const payload: PayloadToken = { usuarioId: usuario.id };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});

// GET /auth/me — confirma que o token é válido e devolve os dados do usuário autenticado.
authRouter.get('/me', autenticar, async (req, res) => {
  if (!req.usuarioId) {
    res.status(401).json({ erro: 'não autenticado' });
    return;
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } });

  if (!usuario) {
    res.status(401).json({ erro: 'usuário não encontrado' });
    return;
  }

  res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
});
