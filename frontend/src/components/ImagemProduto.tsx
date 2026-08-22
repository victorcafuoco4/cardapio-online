import { useState } from 'react';

type ImagemProdutoProps = {
  src: string;
  alt: string;
  className?: string;
};

// Placeholder neutro e 100% interno (SVG inline, nenhuma URL externa) — usado
// quando o produto não tem foto cadastrada (foto vazia) ou quando a URL
// cadastrada falha ao carregar (link quebrado, imagem removida etc.).
export function ImagemProduto({ src, alt, className }: ImagemProdutoProps) {
  const [falhouAoCarregar, setFalhouAoCarregar] = useState(false);
  const semFoto = src.trim().length === 0 || falhouAoCarregar;

  if (semFoto) {
    return (
      <div className={`imagem-produto imagem-produto--vazia ${className ?? ''}`} role="img" aria-label={alt}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="M3 16.5l5.5-5 4 3.5 3-2.5L21 16" />
        </svg>
      </div>
    );
  }

  return (
    <img
      className={`imagem-produto ${className ?? ''}`}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFalhouAoCarregar(true)}
    />
  );
}
