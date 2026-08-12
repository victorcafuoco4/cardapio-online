import { useState } from 'react';
import type { FormEvent } from 'react';
import type { DadosPedido, FormaPagamento, TipoEntrega } from '../types';

type FormularioCheckoutProps = {
  aoConfirmar: (dados: DadosPedido) => void;
  aoVoltar: () => void;
};

type CamposFormulario = {
  nomeCliente: string;
  telefone: string;
  tipoEntrega: TipoEntrega;
  endereco: string;
  formaPagamento: FormaPagamento;
  trocoPara: string;
  observacoes: string;
};

const CAMPOS_INICIAIS: CamposFormulario = {
  nomeCliente: '',
  telefone: '',
  tipoEntrega: 'retirada',
  endereco: '',
  formaPagamento: 'dinheiro',
  trocoPara: '',
  observacoes: '',
};

function validar(campos: CamposFormulario): Partial<Record<keyof CamposFormulario, string>> {
  const erros: Partial<Record<keyof CamposFormulario, string>> = {};

  if (campos.nomeCliente.trim().length === 0) {
    erros.nomeCliente = 'Informe seu nome';
  }
  if (campos.telefone.trim().length === 0) {
    erros.telefone = 'Informe um telefone pra contato';
  }
  if (campos.tipoEntrega === 'entrega' && campos.endereco.trim().length === 0) {
    erros.endereco = 'Informe o endereço de entrega';
  }

  return erros;
}

export function FormularioCheckout({ aoConfirmar, aoVoltar }: FormularioCheckoutProps) {
  const [campos, setCampos] = useState<CamposFormulario>(CAMPOS_INICIAIS);
  const [erros, setErros] = useState<Partial<Record<keyof CamposFormulario, string>>>({});

  function atualizarCampo<Chave extends keyof CamposFormulario>(campo: Chave, valor: CamposFormulario[Chave]) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();

    const errosEncontrados = validar(campos);
    setErros(errosEncontrados);
    if (Object.keys(errosEncontrados).length > 0) return;

    aoConfirmar({
      nomeCliente: campos.nomeCliente.trim(),
      telefone: campos.telefone.trim(),
      tipoEntrega: campos.tipoEntrega,
      endereco: campos.tipoEntrega === 'entrega' ? campos.endereco.trim() : undefined,
      formaPagamento: campos.formaPagamento,
      trocoPara: campos.formaPagamento === 'dinheiro' && campos.trocoPara.trim() ? campos.trocoPara.trim() : undefined,
      observacoes: campos.observacoes.trim() || undefined,
    });
  }

  return (
    <form className="formulario-checkout" onSubmit={aoEnviar} noValidate>
      <h2>Finalizar pedido</h2>

      <div className="campo">
        <label htmlFor="campo-nome">Nome</label>
        <input
          id="campo-nome"
          type="text"
          value={campos.nomeCliente}
          onChange={(e) => atualizarCampo('nomeCliente', e.target.value)}
        />
        {erros.nomeCliente && <span className="campo__erro">{erros.nomeCliente}</span>}
      </div>

      <div className="campo">
        <label htmlFor="campo-telefone">Telefone</label>
        <input
          id="campo-telefone"
          type="tel"
          placeholder="(11) 91234-5678"
          value={campos.telefone}
          onChange={(e) => atualizarCampo('telefone', e.target.value)}
        />
        {erros.telefone && <span className="campo__erro">{erros.telefone}</span>}
      </div>

      <div className="campo">
        <span className="campo__rotulo">Entrega</span>
        <div className="grupo-opcoes">
          <label>
            <input
              type="radio"
              name="tipoEntrega"
              checked={campos.tipoEntrega === 'retirada'}
              onChange={() => atualizarCampo('tipoEntrega', 'retirada')}
            />
            Retirada no local
          </label>
          <label>
            <input
              type="radio"
              name="tipoEntrega"
              checked={campos.tipoEntrega === 'entrega'}
              onChange={() => atualizarCampo('tipoEntrega', 'entrega')}
            />
            Entrega
          </label>
        </div>
      </div>

      {campos.tipoEntrega === 'entrega' && (
        <div className="campo">
          <label htmlFor="campo-endereco">Endereço</label>
          <input
            id="campo-endereco"
            type="text"
            placeholder="Rua, número, bairro"
            value={campos.endereco}
            onChange={(e) => atualizarCampo('endereco', e.target.value)}
          />
          {erros.endereco && <span className="campo__erro">{erros.endereco}</span>}
        </div>
      )}

      <div className="campo">
        <span className="campo__rotulo">Pagamento</span>
        <div className="grupo-opcoes">
          <label>
            <input
              type="radio"
              name="formaPagamento"
              checked={campos.formaPagamento === 'dinheiro'}
              onChange={() => atualizarCampo('formaPagamento', 'dinheiro')}
            />
            Dinheiro
          </label>
          <label>
            <input
              type="radio"
              name="formaPagamento"
              checked={campos.formaPagamento === 'cartao'}
              onChange={() => atualizarCampo('formaPagamento', 'cartao')}
            />
            Cartão na entrega
          </label>
          <label>
            <input
              type="radio"
              name="formaPagamento"
              checked={campos.formaPagamento === 'pix'}
              onChange={() => atualizarCampo('formaPagamento', 'pix')}
            />
            Pix
          </label>
        </div>
      </div>

      {campos.formaPagamento === 'dinheiro' && (
        <div className="campo">
          <label htmlFor="campo-troco">Troco para quanto? (opcional)</label>
          <input
            id="campo-troco"
            type="text"
            inputMode="decimal"
            placeholder="Ex: 50"
            value={campos.trocoPara}
            onChange={(e) => atualizarCampo('trocoPara', e.target.value)}
          />
        </div>
      )}

      <div className="campo">
        <label htmlFor="campo-observacoes">Observações (opcional)</label>
        <textarea
          id="campo-observacoes"
          rows={2}
          value={campos.observacoes}
          onChange={(e) => atualizarCampo('observacoes', e.target.value)}
        />
      </div>

      <div className="checkout__acoes">
        <button type="button" className="botao-secundario" onClick={aoVoltar}>
          Voltar
        </button>
        <button type="submit" className="dialog__adicionar">
          Confirmar pedido
        </button>
      </div>
    </form>
  );
}
