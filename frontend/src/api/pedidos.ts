import { apiAutenticada, apiPublica } from './http';
import type { DadosPedido, ItemCarrinho, PedidoPublico, PedidoResposta, StatusPedido } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

const TIPO_ENTREGA_API: Record<DadosPedido['tipoEntrega'], string> = {
  retirada: 'RETIRADA',
  entrega: 'ENTREGA',
};

const FORMA_PAGAMENTO_API: Record<DadosPedido['formaPagamento'], string> = {
  dinheiro: 'DINHEIRO',
  cartao: 'CARTAO',
  pix: 'PIX',
};

export async function criarPedido(dados: DadosPedido, itensCarrinho: ItemCarrinho[]): Promise<PedidoResposta> {
  const corpo = {
    nomeCliente: dados.nomeCliente,
    telefone: dados.telefone,
    tipoEntrega: TIPO_ENTREGA_API[dados.tipoEntrega],
    endereco: dados.endereco,
    formaPagamento: FORMA_PAGAMENTO_API[dados.formaPagamento],
    trocoPara: dados.trocoPara ? Number(dados.trocoPara) : undefined,
    observacoes: dados.observacoes,
    itens: itensCarrinho.map((item) => ({ produtoId: item.id, quantidade: item.quantidade })),
  };

  const resposta = await fetch(`${API_URL}/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });

  if (!resposta.ok) {
    const corpoErro = await resposta.json().catch(() => null);
    const mensagem =
      corpoErro?.erro ?? (Array.isArray(corpoErro?.erros) ? corpoErro.erros.join(', ') : null) ?? 'Não foi possível enviar o pedido.';
    throw new Error(mensagem);
  }

  return resposta.json();
}

// Busca um pedido pelo token de acompanhamento — nunca pelo id numérico interno.
// Pública de propósito: é a página de acompanhamento que o cliente acessa sem
// estar logado. A resposta vem deliberadamente sem dados pessoais (ver types.ts).
export function buscarPedido(token: string): Promise<PedidoPublico> {
  return apiPublica<PedidoPublico>(`/pedidos/acompanhar/${token}`);
}

// Lista todos os pedidos — usada pelo painel do lojista (protegida no backend).
export function buscarPedidos(): Promise<PedidoResposta[]> {
  return apiAutenticada<PedidoResposta[]>('/pedidos');
}

export function atualizarStatusPedido(id: number, status: StatusPedido): Promise<PedidoResposta> {
  return apiAutenticada<PedidoResposta>(`/pedidos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
