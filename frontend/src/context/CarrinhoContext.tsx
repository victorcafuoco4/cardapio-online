import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ItemCarrinho, Produto } from '../types';

type CarrinhoContextValor = {
  itens: ItemCarrinho[];
  adicionarItem: (produto: Produto, quantidade: number) => void;
  aumentarQuantidade: (produtoId: number) => void;
  diminuirQuantidade: (produtoId: number) => void;
  limparCarrinho: () => void;
  quantidadeTotal: number;
  precoTotal: number;
};

const CarrinhoContext = createContext<CarrinhoContextValor | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  const adicionarItem = useCallback((produto: Produto, quantidade: number) => {
    setItens((atual) => {
      const existente = atual.find((item) => item.id === produto.id);
      if (existente) {
        return atual.map((item) =>
          item.id === produto.id
            ? { ...item, quantidade: Math.min(item.quantidade + quantidade, produto.estoque) }
            : item,
        );
      }
      return [...atual, { ...produto, quantidade: Math.min(quantidade, produto.estoque) }];
    });
  }, []);

  // Nunca deixa passar do estoque disponível pra aquele produto.
  const aumentarQuantidade = useCallback((produtoId: number) => {
    setItens((atual) =>
      atual.map((item) =>
        item.id === produtoId ? { ...item, quantidade: Math.min(item.quantidade + 1, item.estoque) } : item,
      ),
    );
  }, []);

  // Zera e remove o item quando a quantidade chega a 0.
  const diminuirQuantidade = useCallback((produtoId: number) => {
    setItens((atual) =>
      atual
        .map((item) => (item.id === produtoId ? { ...item, quantidade: item.quantidade - 1 } : item))
        .filter((item) => item.quantidade > 0),
    );
  }, []);

  const limparCarrinho = useCallback(() => {
    setItens([]);
  }, []);

  const quantidadeTotal = useMemo(() => itens.reduce((total, item) => total + item.quantidade, 0), [itens]);

  const precoTotal = useMemo(
    () => itens.reduce((total, item) => total + Number(item.preco) * item.quantidade, 0),
    [itens],
  );

  const valor = useMemo(
    () => ({
      itens,
      adicionarItem,
      aumentarQuantidade,
      diminuirQuantidade,
      limparCarrinho,
      quantidadeTotal,
      precoTotal,
    }),
    [itens, adicionarItem, aumentarQuantidade, diminuirQuantidade, limparCarrinho, quantidadeTotal, precoTotal],
  );

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>;
}

export function useCarrinho(): CarrinhoContextValor {
  const contexto = useContext(CarrinhoContext);
  if (!contexto) {
    throw new Error('useCarrinho precisa ser usado dentro de um CarrinhoProvider');
  }
  return contexto;
}
