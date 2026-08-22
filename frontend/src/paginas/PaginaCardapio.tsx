import { useEffect, useRef, useState } from 'react';
import { buscarProdutos } from '../api/produtos';
import { BarraCarrinho } from '../components/BarraCarrinho';
import { BarraCategorias } from '../components/BarraCategorias';
import { BuscaProdutos } from '../components/BuscaProdutos';
import { Cabecalho } from '../components/Cabecalho';
import { CarrinhoDialog } from '../components/CarrinhoDialog';
import { CategoriaSection } from '../components/CategoriaSection';
import { ProdutoDialog } from '../components/ProdutoDialog';
import { CarrinhoProvider } from '../context/CarrinhoContext';
import { normalizarTexto } from '../utils/normalizarTexto';
import type { Produto } from '../types';

type CategoriaAgrupada = {
  id: number;
  nome: string;
  ordem: number;
  produtos: Produto[];
};

// Agrupa a lista "achatada" de produtos por categoria, preservando a ordem
// definida no banco (categoria.ordem, depois produto.ordem — GET /produtos
// já devolve os produtos ordenados assim, esta função só preserva a ordem).
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

// A margem negativa no topo compensa a barra de navegação flutuante (sticky,
// top:10px + ~48px de altura própria): uma seção só conta como "visível"
// depois de sair de baixo dela. A margem negativa embaixo faz a seção
// "ativar" perto do topo da tela, não no meio.
const OPCOES_OBSERVADOR: IntersectionObserverInit = { rootMargin: '-64px 0px -65% 0px', threshold: 0 };

export function PaginaCardapio() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [categoriaAtivaId, setCategoriaAtivaId] = useState<number | null>(null);

  const secaoRefs = useRef(new Map<number, HTMLElement>());
  const idsVisiveisRef = useRef(new Set<number>());
  const callbacksRegistroRef = useRef(new Map<number, (elemento: HTMLElement | null) => void>());

  useEffect(() => {
    buscarProdutos()
      .then(setProdutos)
      .catch(() => setErro('Não foi possível carregar o cardápio. Tente novamente mais tarde.'));
  }, []);

  const termoNormalizado = normalizarTexto(termoBusca.trim());
  const buscando = termoNormalizado.length > 0;
  const produtosFiltrados =
    produtos && buscando
      ? produtos.filter(
          (produto) =>
            normalizarTexto(produto.nome).includes(termoNormalizado) ||
            normalizarTexto(produto.descricao).includes(termoNormalizado),
        )
      : produtos;

  const categoriasAgrupadas = produtosFiltrados ? agruparPorCategoria(produtosFiltrados) : [];
  const idsCategoriasAtuais = categoriasAgrupadas.map((categoria) => categoria.id).join(',');

  // Observa as seções de categoria pra destacar na barra qual está visível —
  // roda também durante a busca, já que a barra continua visível mostrando
  // só as categorias com resultado.
  useEffect(() => {
    if (idsCategoriasAtuais === '') return;

    const ids = idsCategoriasAtuais.split(',').map(Number);
    setCategoriaAtivaId((atual) => (atual !== null && ids.includes(atual) ? atual : ids[0]));

    idsVisiveisRef.current.clear();
    const observer = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        const idAtributo = (entrada.target as HTMLElement).dataset.categoriaId;
        if (!idAtributo) continue;
        const id = Number(idAtributo);
        if (entrada.isIntersecting) {
          idsVisiveisRef.current.add(id);
        } else {
          idsVisiveisRef.current.delete(id);
        }
      }
      const primeiraVisivel = ids.find((id) => idsVisiveisRef.current.has(id));
      if (primeiraVisivel !== undefined) setCategoriaAtivaId(primeiraVisivel);
    }, OPCOES_OBSERVADOR);

    for (const id of ids) {
      const elemento = secaoRefs.current.get(id);
      if (elemento) observer.observe(elemento);
    }

    return () => observer.disconnect();
  }, [idsCategoriasAtuais]);

  // Callback ref estável por categoria (mesma referência entre renders) —
  // evita que o React desregistre/registre a seção a cada render.
  function registrarSecao(id: number) {
    let callback = callbacksRegistroRef.current.get(id);
    if (!callback) {
      callback = (elemento: HTMLElement | null) => {
        if (elemento) {
          elemento.dataset.categoriaId = String(id);
          secaoRefs.current.set(id, elemento);
        } else {
          secaoRefs.current.delete(id);
        }
      };
      callbacksRegistroRef.current.set(id, callback);
    }
    return callback;
  }

  function irParaCategoria(id: number) {
    const elemento = secaoRefs.current.get(id);
    if (!elemento) return;
    const prefereReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    elemento.scrollIntoView({ behavior: prefereReduzido ? 'auto' : 'smooth', block: 'start' });
    setCategoriaAtivaId(id);
  }

  const semNenhumResultadoDeBusca = buscando && !!produtos && produtos.length > 0 && categoriasAgrupadas.length === 0;

  return (
    <CarrinhoProvider>
      <Cabecalho />

      {/* Categorias à esquerda, busca à direita, uma linha só — fica visível
          também durante a busca (categoriasAgrupadas já vem filtrada, então
          só aparecem categorias com resultado). */}
      {produtos && produtos.length > 0 && (
        <div className="nav-flutuante">
          <BarraCategorias
            categorias={categoriasAgrupadas.map((categoria) => ({ id: categoria.id, nome: categoria.nome }))}
            categoriaAtivaId={categoriaAtivaId}
            aoSelecionar={irParaCategoria}
          />
          <BuscaProdutos valor={termoBusca} aoAlterar={setTermoBusca} />
        </div>
      )}

      <main>
        {erro && <p className="estado estado--erro">{erro}</p>}

        {!erro && !produtos && (
          <div className="skeleton-produtos" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, indice) => (
              <div key={indice} className="skeleton-card">
                <div className="skeleton-card__foto" />
                <div className="skeleton-card__linha" />
                <div className="skeleton-card__linha skeleton-card__linha--curta" />
              </div>
            ))}
          </div>
        )}

        {!erro && produtos && produtos.length === 0 && (
          <p className="estado">O cardápio ainda não tem produtos publicados. Volte mais tarde.</p>
        )}

        {!erro && semNenhumResultadoDeBusca && (
          <p className="estado">Nenhum produto encontrado para "{termoBusca.trim()}".</p>
        )}

        {!erro &&
          categoriasAgrupadas.map((categoria) => (
            <CategoriaSection
              key={categoria.id}
              id={categoria.id}
              nome={categoria.nome}
              produtos={categoria.produtos}
              aoVerDetalhes={setProdutoSelecionado}
              registrarSecao={registrarSecao(categoria.id)}
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
