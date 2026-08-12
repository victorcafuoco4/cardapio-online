import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PaginaLogin() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);

    try {
      await entrar(email.trim(), senha);
      navigate('/painel');
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : 'Não foi possível fazer login.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-login">
      <form className="cartao-login" onSubmit={aoEnviar} noValidate>
        <h1>Área do lojista</h1>
        <p className="pagina-login__subtitulo">Doralina Vegana</p>

        <div className="campo">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="login-senha">Senha</label>
          <input
            id="login-senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        {erro && <p className="campo__erro campo__erro--envio">{erro}</p>}

        <button type="submit" className="dialog__adicionar" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
