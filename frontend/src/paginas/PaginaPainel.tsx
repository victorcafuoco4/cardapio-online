import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PainelCategorias } from './painel/PainelCategorias';
import { PainelProdutos } from './painel/PainelProdutos';

type Aba = 'produtos' | 'categorias';

export function PaginaPainel() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>('produtos');

  function aoSair() {
    sair();
    navigate('/painel/login');
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
        <button className={aba === 'produtos' ? 'ativa' : ''} onClick={() => setAba('produtos')}>
          Produtos
        </button>
        <button className={aba === 'categorias' ? 'ativa' : ''} onClick={() => setAba('categorias')}>
          Categorias
        </button>
      </nav>

      <main className="painel-conteudo">{aba === 'produtos' ? <PainelProdutos /> : <PainelCategorias />}</main>
    </div>
  );
}
