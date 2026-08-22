import { useEffect, useRef } from 'react';

type CategoriaResumo = {
  id: number;
  nome: string;
};

type BarraCategoriasProps = {
  categorias: CategoriaResumo[];
  categoriaAtivaId: number | null;
  aoSelecionar: (categoriaId: number) => void;
};

// A ordem das categorias é sempre a recebida do backend (já vem ordenada por
// categoria.ordem em GET /categorias); este componente só exibe, não reordena.
//
// Este <nav> só cuida da rolagem horizontal dos botões (overflow-x:auto) —
// de propósito NÃO tem position:sticky. Quem gruda no topo é o pai,
// .nav-flutuante (em PaginaCardapio.tsx), que por sua vez não tem overflow
// nenhum. position:sticky e overflow (mesmo só overflow-x) não podem conviver
// no MESMO elemento: ao definir overflow-x diferente de visible, o navegador
// computa overflow-y como auto também (só fica "visible" se os dois eixos
// forem visible), e o elemento passa a estabelecer seu próprio contexto de
// rolagem — um elemento que rola por conta própria não gruda ("stick") de
// forma confiável na janela. Na prática, Chrome, Firefox e Safari ignoram o
// sticky nesse caso, como se fosse position:static.
export function BarraCategorias({ categorias, categoriaAtivaId, aoSelecionar }: BarraCategoriasProps) {
  const containerRef = useRef<HTMLElement>(null);
  const botaoRefs = useRef(new Map<number, HTMLButtonElement>());

  // Quando a categoria ativa muda (por clique OU pela rolagem da página),
  // centraliza o botão correspondente DENTRO da própria barra.
  //
  // Deliberadamente NÃO usa scrollIntoView: mesmo com block:'nearest', ele
  // percorre toda a cadeia de ancestrais roláveis do botão — incluindo a
  // janela — e como a barra é position:sticky, o navegador pode interpretar
  // o botão como "fora da vista" verticalmente durante o scroll e corrigir a
  // rolagem da página sozinho (o bug: rolar pra baixo "volta" sozinho).
  // container.scrollTo() mexe só no scrollLeft deste container, nunca em
  // window.scrollY — por isso é seguro aqui.
  useEffect(() => {
    if (categoriaAtivaId === null) return;
    const container = containerRef.current;
    const botao = botaoRefs.current.get(categoriaAtivaId);
    if (!container || !botao) return;

    const scrollMaximo = Math.max(container.scrollWidth - container.clientWidth, 0);
    const alvo = botao.offsetLeft - container.clientWidth / 2 + botao.offsetWidth / 2;
    const alvoLimitado = Math.min(Math.max(alvo, 0), scrollMaximo);

    const prefereReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({ left: alvoLimitado, behavior: prefereReduzido ? 'auto' : 'smooth' });
  }, [categoriaAtivaId]);

  if (categorias.length === 0) return null;

  return (
    <nav className="barra-categorias" aria-label="Categorias do cardápio" ref={containerRef}>
      {categorias.map((categoria) => (
        <button
          key={categoria.id}
          ref={(elemento) => {
            if (elemento) botaoRefs.current.set(categoria.id, elemento);
            else botaoRefs.current.delete(categoria.id);
          }}
          type="button"
          className={categoria.id === categoriaAtivaId ? 'ativa' : ''}
          aria-current={categoria.id === categoriaAtivaId ? 'true' : undefined}
          onClick={() => aoSelecionar(categoria.id)}
        >
          {categoria.nome}
        </button>
      ))}
    </nav>
  );
}
