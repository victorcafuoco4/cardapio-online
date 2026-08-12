import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PaginaPainel() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();

  function aoSair() {
    sair();
    navigate('/painel/login');
  }

  return (
    <div className="pagina-painel">
      <header className="painel-cabecalho">
        <h1>Painel — Doralina Vegana</h1>
        <button className="botao-secundario" onClick={aoSair}>
          Sair
        </button>
      </header>

      <main className="painel-conteudo">
        <p>Bem-vindo, {usuario?.nome}!</p>
        <p className="estado">
          O painel de gestão (produtos, categorias e pedidos) chega nas próximas etapas.
        </p>
      </main>
    </div>
  );
}
