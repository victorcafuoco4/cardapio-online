import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { atualizarCategoria, criarCategoria } from '../../api/categorias';
import type { Categoria } from '../../types';

type FormularioCategoriaPainelProps = {
  aberto: boolean;
  categoria: Categoria | null;
  aoFechar: () => void;
  aoSalvar: () => void;
};

export function FormularioCategoriaPainel({ aberto, categoria, aoFechar, aoSalvar }: FormularioCategoriaPainelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [nome, setNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (aberto) {
      setErro(null);
      setNome(categoria?.nome ?? '');
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [aberto, categoria]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();

    if (!nome.trim()) {
      setErro('Informe o nome da categoria.');
      return;
    }

    setEnviando(true);
    setErro(null);

    const dados = { nome: nome.trim() };

    try {
      if (categoria) {
        await atualizarCategoria(categoria.id, dados);
      } else {
        await criarCategoria(dados);
      }
      aoSalvar();
    } catch (erroEnvio) {
      setErro(erroEnvio instanceof Error ? erroEnvio.message : 'Não foi possível salvar a categoria.');
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
        <h2>{categoria ? 'Editar categoria' : 'Nova categoria'}</h2>

        <div className="campo">
          <label htmlFor="categoria-nome">Nome</label>
          <input id="categoria-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
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
