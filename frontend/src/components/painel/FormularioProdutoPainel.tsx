import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { atualizarProduto, criarProduto } from '../../api/produtos';
import type { Categoria, Produto } from '../../types';

type FormularioProdutoPainelProps = {
  aberto: boolean;
  produto: Produto | null;
  categorias: Categoria[];
  aoFechar: () => void;
  aoSalvar: () => void;
};

type Campos = {
  nome: string;
  descricao: string;
  preco: string;
  foto: string;
  categoriaId: string;
  estoque: string;
  disponivel: boolean;
};

const CAMPOS_VAZIOS: Campos = {
  nome: '',
  descricao: '',
  preco: '',
  foto: '',
  categoriaId: '',
  estoque: '0',
  disponivel: true,
};

export function FormularioProdutoPainel({
  aberto,
  produto,
  categorias,
  aoFechar,
  aoSalvar,
}: FormularioProdutoPainelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [campos, setCampos] = useState<Campos>(CAMPOS_VAZIOS);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (aberto) {
      setErro(null);
      setCampos(
        produto
          ? {
              nome: produto.nome,
              descricao: produto.descricao,
              preco: produto.preco,
              foto: produto.foto,
              categoriaId: String(produto.categoriaId),
              estoque: String(produto.estoque),
              disponivel: produto.disponivel,
            }
          : CAMPOS_VAZIOS,
      );
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [aberto, produto]);

  function atualizarCampo<Chave extends keyof Campos>(campo: Chave, valor: Campos[Chave]) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();

    const preco = Number(campos.preco.replace(',', '.'));
    const categoriaId = Number(campos.categoriaId);
    const estoque = campos.estoque.trim() ? Number(campos.estoque) : 0;

    if (
      !campos.nome.trim() ||
      !campos.descricao.trim() ||
      !campos.foto.trim() ||
      !Number.isFinite(preco) ||
      preco <= 0 ||
      !categoriaId ||
      !Number.isInteger(estoque) ||
      estoque < 0
    ) {
      setErro('Preencha nome, descrição, foto, um preço válido, uma categoria e um estoque válido (inteiro, ≥ 0).');
      return;
    }

    setEnviando(true);
    setErro(null);

    const dados = {
      nome: campos.nome.trim(),
      descricao: campos.descricao.trim(),
      preco,
      foto: campos.foto.trim(),
      categoriaId,
      estoque,
      disponivel: campos.disponivel,
    };

    try {
      if (produto) {
        await atualizarProduto(produto.id, dados);
      } else {
        await criarProduto(dados);
      }
      aoSalvar();
    } catch (erroEnvio) {
      setErro(erroEnvio instanceof Error ? erroEnvio.message : 'Não foi possível salvar o produto.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="dialog-produto" onClose={aoFechar}>
      <button className="dialog__fechar" aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
        ×
      </button>
      <form className="formulario-checkout" onSubmit={aoEnviar} noValidate>
        <h2>{produto ? 'Editar produto' : 'Novo produto'}</h2>

        <div className="campo">
          <label htmlFor="produto-nome">Nome</label>
          <input
            id="produto-nome"
            type="text"
            value={campos.nome}
            onChange={(e) => atualizarCampo('nome', e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="produto-descricao">Descrição</label>
          <textarea
            id="produto-descricao"
            rows={2}
            value={campos.descricao}
            onChange={(e) => atualizarCampo('descricao', e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="produto-preco">Preço</label>
          <input
            id="produto-preco"
            type="text"
            inputMode="decimal"
            placeholder="Ex: 32.90"
            value={campos.preco}
            onChange={(e) => atualizarCampo('preco', e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="produto-foto">URL da foto</label>
          <input
            id="produto-foto"
            type="text"
            value={campos.foto}
            onChange={(e) => atualizarCampo('foto', e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="produto-categoria">Categoria</label>
          <select
            id="produto-categoria"
            value={campos.categoriaId}
            onChange={(e) => atualizarCampo('categoriaId', e.target.value)}
          >
            <option value="">Selecione</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="produto-estoque">Estoque</label>
          <input
            id="produto-estoque"
            type="text"
            inputMode="numeric"
            value={campos.estoque}
            onChange={(e) => atualizarCampo('estoque', e.target.value)}
          />
        </div>

        <div className="campo campo--checkbox">
          <label htmlFor="produto-disponivel">
            <input
              id="produto-disponivel"
              type="checkbox"
              checked={campos.disponivel}
              onChange={(e) => atualizarCampo('disponivel', e.target.checked)}
            />
            Disponível para venda
          </label>
        </div>

        {erro && <p className="campo__erro campo__erro--envio">{erro}</p>}

        <div className="checkout__acoes">
          <button
            type="button"
            className="botao-secundario"
            onClick={() => dialogRef.current?.close()}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button type="submit" className="dialog__adicionar" disabled={enviando}>
            {enviando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
