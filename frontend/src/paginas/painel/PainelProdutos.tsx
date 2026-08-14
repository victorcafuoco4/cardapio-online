import { useCallback, useEffect, useState } from 'react';
import { FormularioProdutoPainel } from '../../components/painel/FormularioProdutoPainel';
import { buscarCategorias } from '../../api/categorias';
import { atualizarProduto, buscarProdutos, reordenarProdutos, removerProduto } from '../../api/produtos';
import { formatarPreco } from '../../utils/formatarPreco';
import type { Categoria, Produto } from '../../types';

// Agrupa os produtos (lista "achatada" da API) por categoria, na ordem de
// exibição das categorias — precisa disso pra "mover pra cima" fazer sentido
// dentro de cada grupo, sem misturar categorias diferentes na mesma lista.
function agruparPorCategoria(categorias: Categoria[], produtos: Produto[]): { categoria: Categoria; produtos: Produto[] }[] {
  return categorias.map((categoria) => ({
    categoria,
    produtos: produtos.filter((produto) => produto.categoriaId === categoria.id).sort((a, b) => a.ordem - b.ordem),
  }));
}

export function PainelProdutos() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [alternandoId, setAlternandoId] = useState<number | null>(null);
  const [movendoId, setMovendoId] = useState<number | null>(null);

  const carregar = useCallback(() => {
    Promise.all([buscarProdutos(), buscarCategorias()])
      .then(([produtosResp, categoriasResp]) => {
        setProdutos(produtosResp);
        setCategorias(categoriasResp);
      })
      .catch(() => setErro('Não foi possível carregar os produtos.'));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirNovo() {
    setProdutoEditando(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(produto: Produto) {
    setProdutoEditando(produto);
    setFormularioAberto(true);
  }

  async function excluir(produto: Produto) {
    if (!confirm(`Remover "${produto.nome}"?`)) return;

    setErroAcao(null);
    try {
      await removerProduto(produto.id);
      carregar();
    } catch (erro) {
      setErroAcao(erro instanceof Error ? erro.message : 'Não foi possível remover o produto.');
    }
  }

  async function alternarDisponibilidade(produto: Produto) {
    setErroAcao(null);
    setAlternandoId(produto.id);
    try {
      await atualizarProduto(produto.id, { disponivel: !produto.disponivel });
      carregar();
    } catch (erro) {
      setErroAcao(erro instanceof Error ? erro.message : 'Não foi possível alterar a disponibilidade.');
    } finally {
      setAlternandoId(null);
    }
  }

  // produtosDaCategoria já vem ordenada por "ordem" — a posição no array é a
  // posição visual dentro da categoria. Nunca atravessa pra outra categoria:
  // o array de ids mandado pro backend é sempre só os produtos dessa categoria.
  async function mover(produtosDaCategoria: Produto[], produto: Produto, direcao: -1 | 1) {
    const indiceAtual = produtosDaCategoria.findIndex((p) => p.id === produto.id);
    const indiceNovo = indiceAtual + direcao;
    if (indiceNovo < 0 || indiceNovo >= produtosDaCategoria.length) return;

    const reordenados = [...produtosDaCategoria];
    [reordenados[indiceAtual], reordenados[indiceNovo]] = [reordenados[indiceNovo], reordenados[indiceAtual]];

    setErroAcao(null);
    setMovendoId(produto.id);
    try {
      await reordenarProdutos(
        produto.categoriaId,
        reordenados.map((p) => p.id),
      );
      carregar();
    } catch (erro) {
      setErroAcao(erro instanceof Error ? erro.message : 'Não foi possível reordenar os produtos.');
    } finally {
      setMovendoId(null);
    }
  }

  const grupos = produtos ? agruparPorCategoria(categorias, produtos) : [];

  return (
    <div className="painel-secao">
      <div className="painel-secao__cabecalho">
        <h2>Produtos</h2>
        <button className="botao-primario" onClick={abrirNovo}>
          Novo produto
        </button>
      </div>

      {erro && <p className="estado estado--erro">{erro}</p>}
      {erroAcao && <p className="estado estado--erro">{erroAcao}</p>}
      {!erro && !produtos && <p className="estado">Carregando...</p>}
      {produtos && produtos.length === 0 && <p className="estado">Nenhum produto cadastrado ainda.</p>}

      {grupos.map(({ categoria, produtos: produtosDaCategoria }) => (
        <div key={categoria.id} className="painel-produtos__categoria">
          <h3>{categoria.nome}</h3>
          {produtosDaCategoria.length === 0 ? (
            <p className="estado">Nenhum produto nesta categoria ainda.</p>
          ) : (
            <table className="tabela-painel">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Disponibilidade</th>
                  <th aria-label="Reordenar"></th>
                  <th aria-label="Ações"></th>
                </tr>
              </thead>
              <tbody>
                {produtosDaCategoria.map((produto, indice) => (
                  <tr key={produto.id}>
                    <td>{produto.nome}</td>
                    <td>{formatarPreco(Number(produto.preco))}</td>
                    <td className={produto.estoque === 0 ? 'tabela-painel__esgotado' : undefined}>
                      {produto.estoque === 0 ? 'Esgotado' : produto.estoque}
                    </td>
                    <td className={produto.disponivel ? undefined : 'tabela-painel__esgotado'}>
                      {produto.disponivel ? 'Disponível' : 'Indisponível'}
                    </td>
                    <td className="tabela-painel__ordem">
                      <button
                        aria-label="Mover para cima"
                        onClick={() => mover(produtosDaCategoria, produto, -1)}
                        disabled={indice === 0 || movendoId !== null}
                      >
                        ↑
                      </button>
                      <button
                        aria-label="Mover para baixo"
                        onClick={() => mover(produtosDaCategoria, produto, 1)}
                        disabled={indice === produtosDaCategoria.length - 1 || movendoId !== null}
                      >
                        ↓
                      </button>
                    </td>
                    <td className="tabela-painel__acoes">
                      <button onClick={() => abrirEdicao(produto)}>Editar</button>
                      <button onClick={() => alternarDisponibilidade(produto)} disabled={alternandoId === produto.id}>
                        {produto.disponivel ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => excluir(produto)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <FormularioProdutoPainel
        aberto={formularioAberto}
        produto={produtoEditando}
        categorias={categorias}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={() => {
          setFormularioAberto(false);
          carregar();
        }}
      />
    </div>
  );
}
