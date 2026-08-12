import { useEffect, useState } from 'react';
import { buscarProdutos } from './api/produtos';
import { BarraCarrinho } from './components/BarraCarrinho';
import { Cabecalho } from './components/Cabecalho';
import { CarrinhoDialog } from './components/CarrinhoDialog';
import { CategoriaSection } from './components/CategoriaSection';
import { ProdutoDialog } from './components/ProdutoDialog';
import { CarrinhoProvider } from './context/CarrinhoContext';
import type { Produto } from './types';

type CategoriaAgrupada = {
  id: number;
  nome: string;
  ordem: number;
  produtos: Produto[];
};

// Agrupa a lista "achatada" de produtos por categoria, preservando a ordem
// definida no banco (categoria.ordem, depois produto.ordem).
function agruparPorCategoria(produtos: Produto[]): CategoriaAgrupada[] {
  const categorias = new Map<number, CategoriaAgrupada>();

  for (const produto of produtos) {
    const existente = categorias.get(produto.categoriaId);
    if (existente) {
      existente.produtos.push(produto);
    } else {
      categorias.set(produto.categoriaId, {
        id: produto.categoriaId,
        nome: produto.categoria.nome,
        ordem: produto.categoria.ordem,
        produtos: [produto],
      });
    }
  }

  return [...categorias.values()].sort((a, b) => a.ordem - b.ordem);
}

function App() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  useEffect(() => {
    buscarProdutos()
      .then(setProdutos)
      .catch(() => setErro('Não foi possível carregar o cardápio. Tente novamente mais tarde.'));
  }, []);

  return (
    <CarrinhoProvider>
      <Cabecalho />

      <main>
        {erro && <p className="estado estado--erro">{erro}</p>}
        {!erro && !produtos && <p className="estado">Carregando cardápio...</p>}
        {produtos &&
          agruparPorCategoria(produtos).map((categoria) => (
            <CategoriaSection
              key={categoria.id}
              id={categoria.id}
              nome={categoria.nome}
              produtos={categoria.produtos}
              aoVerDetalhes={setProdutoSelecionado}
            />
          ))}
      </main>

      <footer className="rodape">
        <p>Doralina Vegana — Retirada e entrega</p>
      </footer>

      <ProdutoDialog produto={produtoSelecionado} aoFechar={() => setProdutoSelecionado(null)} />

      <BarraCarrinho aoAbrir={() => setCarrinhoAberto(true)} />
      <CarrinhoDialog aberto={carrinhoAberto} aoFechar={() => setCarrinhoAberto(false)} />
    </CarrinhoProvider>
  );
}

export default App;
