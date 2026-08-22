type BuscaProdutosProps = {
  valor: string;
  aoAlterar: (valor: string) => void;
};

export function BuscaProdutos({ valor, aoAlterar }: BuscaProdutosProps) {
  return (
    <div className="busca-produtos">
      <label htmlFor="busca-produtos" className="busca-produtos__rotulo-oculto">
        Buscar prato pelo nome ou descrição
      </label>
      <svg className="busca-produtos__icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M20 20l-4.35-4.35" />
      </svg>
      <input
        id="busca-produtos"
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Buscar prato..."
        value={valor}
        onChange={(e) => aoAlterar(e.target.value)}
      />
      {valor.length > 0 && (
        <button type="button" className="busca-produtos__limpar" aria-label="Limpar busca" onClick={() => aoAlterar('')}>
          ×
        </button>
      )}
    </div>
  );
}
