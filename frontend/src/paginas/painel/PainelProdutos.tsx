import { useCallback, useEffect, useState } from 'react';
import { FormularioProdutoPainel } from '../../components/painel/FormularioProdutoPainel';
import { buscarCategorias } from '../../api/categorias';
import { buscarProdutos, removerProduto } from '../../api/produtos';
import { formatarPreco } from '../../utils/formatarPreco';
import type { Categoria, Produto } from '../../types';

export function PainelProdutos() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);

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

      {produtos && produtos.length > 0 && (
        <table className="tabela-painel">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th aria-label="Ações"></th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) => (
              <tr key={produto.id}>
                <td>{produto.nome}</td>
                <td>{produto.categoria.nome}</td>
                <td>{formatarPreco(Number(produto.preco))}</td>
                <td className={produto.estoque === 0 ? 'tabela-painel__esgotado' : undefined}>
                  {produto.estoque === 0 ? 'Esgotado' : produto.estoque}
                </td>
                <td className="tabela-painel__acoes">
                  <button onClick={() => abrirEdicao(produto)}>Editar</button>
                  <button onClick={() => excluir(produto)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {produtos && produtos.length === 0 && <p className="estado">Nenhum produto cadastrado ainda.</p>}

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
