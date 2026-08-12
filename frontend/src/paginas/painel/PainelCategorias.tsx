import { useCallback, useEffect, useState } from 'react';
import { FormularioCategoriaPainel } from '../../components/painel/FormularioCategoriaPainel';
import { buscarCategorias, removerCategoria } from '../../api/categorias';
import type { Categoria } from '../../types';

export function PainelCategorias() {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);

  const carregar = useCallback(() => {
    buscarCategorias()
      .then(setCategorias)
      .catch(() => setErro('Não foi possível carregar as categorias.'));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirNova() {
    setCategoriaEditando(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(categoria: Categoria) {
    setCategoriaEditando(categoria);
    setFormularioAberto(true);
  }

  async function excluir(categoria: Categoria) {
    if (!confirm(`Remover a categoria "${categoria.nome}"?`)) return;

    setErroAcao(null);
    try {
      await removerCategoria(categoria.id);
      carregar();
    } catch (erro) {
      setErroAcao(erro instanceof Error ? erro.message : 'Não foi possível remover a categoria.');
    }
  }

  return (
    <div className="painel-secao">
      <div className="painel-secao__cabecalho">
        <h2>Categorias</h2>
        <button className="botao-primario" onClick={abrirNova}>
          Nova categoria
        </button>
      </div>

      {erro && <p className="estado estado--erro">{erro}</p>}
      {erroAcao && <p className="estado estado--erro">{erroAcao}</p>}
      {!erro && !categorias && <p className="estado">Carregando...</p>}

      {categorias && categorias.length > 0 && (
        <table className="tabela-painel">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Ordem</th>
              <th aria-label="Ações"></th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => (
              <tr key={categoria.id}>
                <td>{categoria.nome}</td>
                <td>{categoria.ordem}</td>
                <td className="tabela-painel__acoes">
                  <button onClick={() => abrirEdicao(categoria)}>Editar</button>
                  <button onClick={() => excluir(categoria)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {categorias && categorias.length === 0 && <p className="estado">Nenhuma categoria cadastrada ainda.</p>}

      <FormularioCategoriaPainel
        aberto={formularioAberto}
        categoria={categoriaEditando}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={() => {
          setFormularioAberto(false);
          carregar();
        }}
      />
    </div>
  );
}
