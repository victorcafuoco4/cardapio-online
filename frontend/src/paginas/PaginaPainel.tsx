import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PainelCategorias } from './painel/PainelCategorias';
import { PainelDashboard } from './painel/PainelDashboard';
import { PainelPedidos } from './painel/PainelPedidos';
import { PainelProdutos } from './painel/PainelProdutos';

export type Aba = 'dashboard' | 'produtos' | 'categorias' | 'pedidos';

const ABAS_VALIDAS: readonly Aba[] = ['dashboard', 'pedidos', 'produtos', 'categorias'];

// Parâmetro ausente ou com qualquer valor que não seja uma das 4 abas
// conhecidas sempre cai no Dashboard — nunca deixa a tela em branco por
// causa de uma URL digitada errada ou de um link antigo.
function validarAba(valor: string | null): Aba {
  return ABAS_VALIDAS.includes(valor as Aba) ? (valor as Aba) : 'dashboard';
}

export function PaginaPainel() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const aba = validarAba(searchParams.get('aba'));

  function aoSair() {
    sair();
    navigate('/painel/login');
  }

  // replace: true — trocar de aba não deveria empilhar histórico de navegador
  // (é a mesma página, só muda o conteúdo), igual ao comportamento anterior
  // com useState, onde clicar nas abas nunca criava uma entrada no histórico.
  function irParaAba(novaAba: Aba) {
    setSearchParams({ aba: novaAba }, { replace: true });
  }

  return (
    <div className="pagina-painel">
      <header className="painel-cabecalho">
        <div>
          <h1>Painel — Doralina Vegana</h1>
          <p className="painel-cabecalho__usuario">Olá, {usuario?.nome}</p>
        </div>
        <button className="botao-secundario" onClick={aoSair}>
          Sair
        </button>
      </header>

      <nav className="painel-abas">
        <button className={aba === 'dashboard' ? 'ativa' : ''} onClick={() => irParaAba('dashboard')}>
          Dashboard
        </button>
        <button className={aba === 'pedidos' ? 'ativa' : ''} onClick={() => irParaAba('pedidos')}>
          Pedidos
        </button>
        <button className={aba === 'produtos' ? 'ativa' : ''} onClick={() => irParaAba('produtos')}>
          Produtos
        </button>
        <button className={aba === 'categorias' ? 'ativa' : ''} onClick={() => irParaAba('categorias')}>
          Categorias
        </button>
        <Link to="/painel/precificacao">Precificação</Link>
      </nav>

      <main className="painel-conteudo">
        {aba === 'dashboard' && <PainelDashboard />}
        {aba === 'pedidos' && <PainelPedidos />}
        {aba === 'produtos' && <PainelProdutos />}
        {aba === 'categorias' && <PainelCategorias />}
      </main>
    </div>
  );
}
