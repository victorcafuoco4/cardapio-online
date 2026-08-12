import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      usuarioId?: number;
    }
  }
}

const jwtSecretEnv = process.env.JWT_SECRET;
if (!jwtSecretEnv) {
  throw new Error('JWT_SECRET não configurado');
}
export const JWT_SECRET: string = jwtSecretEnv;

export type PayloadToken = { usuarioId: number };

// Protege uma rota: exige um token JWT válido no header Authorization e
// disponibiliza o id do usuário autenticado em req.usuarioId pro handler seguinte.
export function autenticar(req: Request, res: Response, next: NextFunction) {
  const cabecalho = req.headers.authorization;
  const token = cabecalho?.startsWith('Bearer ') ? cabecalho.slice('Bearer '.length) : null;

  if (!token) {
    res.status(401).json({ erro: 'token não informado' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as PayloadToken;
    req.usuarioId = payload.usuarioId;
    next();
  } catch {
    res.status(401).json({ erro: 'token inválido ou expirado' });
  }
}
