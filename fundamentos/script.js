// Estado do carrinho, em memória: um array de objetos.
// Cada item: { id, nome, preco, quantidade }
// "Em memória" quer dizer que some se a página for recarregada — isso é
// esperado nesta etapa; carrinho persistente vem mais pra frente.
const carrinho = [];

// Guarda o produto que está aberto no modal de detalhes no momento
let produtoSelecionado = null;
let quantidadeSelecionada = 1;

// ---------- Referências aos elementos do DOM ----------

const dialogProduto = document.getElementById('dialog-produto');
const dialogFoto = document.getElementById('dialog-foto');
const dialogNome = document.getElementById('dialog-nome');
const dialogDescricao = document.getElementById('dialog-descricao');
const dialogPreco = document.getElementById('dialog-preco');
const dialogQtd = document.getElementById('dialog-qtd');

const barraCarrinho = document.getElementById('barra-carrinho');
const carrinhoContagem = document.getElementById('carrinho-contagem');
const carrinhoTotal = document.getElementById('carrinho-total');

const dialogCarrinho = document.getElementById('dialog-carrinho');
const listaCarrinho = document.getElementById('lista-carrinho');
const carrinhoTotalGeral = document.getElementById('carrinho-total-geral');

// ---------- Funções auxiliares ----------

// Converte o texto "R$ 32,90" (como está escrito no HTML) em número: 32.9
function textoParaPreco(texto) {
  return Number(texto.replace('R$', '').trim().replace(',', '.'));
}

// Converte um número em texto de moeda: 32.9 -> "R$ 32,90"
function precoParaTexto(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcularTotalCarrinho() {
  return carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0);
}

function calcularQuantidadeCarrinho() {
  return carrinho.reduce((total, item) => total + item.quantidade, 0);
}

// ---------- Abrir o modal de detalhes do produto ----------

// Um listener por botão "Ver detalhes". Cada um sabe encontrar seu próprio
// <article class="produto"> com .closest(), e lê os dados direto do HTML.
document.querySelectorAll('.produto__botao').forEach((botao) => {
  botao.addEventListener('click', () => {
    const artigo = botao.closest('.produto');
    abrirDialogProduto(artigo);
  });
});

function abrirDialogProduto(artigo) {
  produtoSelecionado = {
    id: artigo.dataset.id,
    nome: artigo.querySelector('.produto__nome').textContent,
    descricao: artigo.querySelector('.produto__descricao').textContent,
    preco: textoParaPreco(artigo.querySelector('.produto__preco').textContent),
    foto: artigo.querySelector('.produto__foto').src,
  };

  dialogFoto.src = produtoSelecionado.foto;
  dialogFoto.alt = produtoSelecionado.nome;
  dialogNome.textContent = produtoSelecionado.nome;
  dialogDescricao.textContent = produtoSelecionado.descricao;
  dialogPreco.textContent = precoParaTexto(produtoSelecionado.preco);

  quantidadeSelecionada = 1;
  dialogQtd.textContent = quantidadeSelecionada;

  dialogProduto.showModal();
}

document.getElementById('fechar-dialog-produto').addEventListener('click', () => {
  dialogProduto.close();
});

document.getElementById('btn-aumentar').addEventListener('click', () => {
  quantidadeSelecionada++;
  dialogQtd.textContent = quantidadeSelecionada;
});

document.getElementById('btn-diminuir').addEventListener('click', () => {
  if (quantidadeSelecionada > 1) {
    quantidadeSelecionada--;
    dialogQtd.textContent = quantidadeSelecionada;
  }
});

document.getElementById('btn-adicionar').addEventListener('click', () => {
  adicionarAoCarrinho(produtoSelecionado, quantidadeSelecionada);
  dialogProduto.close();
});

// ---------- Carrinho: adicionar item ----------

function adicionarAoCarrinho(produto, quantidade) {
  const itemExistente = carrinho.find((item) => item.id === produto.id);

  if (itemExistente) {
    itemExistente.quantidade += quantidade;
  } else {
    // "..." (spread) copia todos os campos de produto pra um objeto novo,
    // e a gente acrescenta o campo quantidade nesse objeto novo.
    carrinho.push({ ...produto, quantidade });
  }

  atualizarBarraCarrinho();
}

// ---------- Barra fixa do carrinho ----------

function atualizarBarraCarrinho() {
  const quantidadeTotal = calcularQuantidadeCarrinho();

  if (quantidadeTotal === 0) {
    barraCarrinho.hidden = true;
    return;
  }

  barraCarrinho.hidden = false;
  carrinhoContagem.textContent = `${quantidadeTotal} ${quantidadeTotal === 1 ? 'item' : 'itens'}`;
  carrinhoTotal.textContent = precoParaTexto(calcularTotalCarrinho());
}

barraCarrinho.addEventListener('click', () => {
  renderizarCarrinho();
  dialogCarrinho.showModal();
});

document.getElementById('fechar-dialog-carrinho').addEventListener('click', () => {
  dialogCarrinho.close();
});

// ---------- Modal do carrinho: listar itens ----------

function renderizarCarrinho() {
  listaCarrinho.innerHTML = '';

  carrinho.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'item-carrinho';
    li.innerHTML = `
      <span class="item-carrinho__nome">${item.nome}</span>
      <div class="item-carrinho__controles">
        <button data-acao="diminuir" data-id="${item.id}" aria-label="Diminuir quantidade">−</button>
        <span>${item.quantidade}</span>
        <button data-acao="aumentar" data-id="${item.id}" aria-label="Aumentar quantidade">+</button>
      </div>
      <span class="item-carrinho__subtotal">${precoParaTexto(item.preco * item.quantidade)}</span>
    `;
    listaCarrinho.appendChild(li);
  });

  carrinhoTotalGeral.textContent = precoParaTexto(calcularTotalCarrinho());
}

// Delegação de evento: em vez de um listener por botão +/- (que nem existem
// ainda quando a página carrega, são criados depois pelo renderizarCarrinho),
// colocamos UM listener no elemento pai (<ul>) e descobrimos em qual botão
// o clique aconteceu com evento.target.closest('button').
listaCarrinho.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button');
  if (!botao) return;

  const id = botao.dataset.id;
  const item = carrinho.find((item) => item.id === id);
  if (!item) return;

  if (botao.dataset.acao === 'aumentar') {
    item.quantidade++;
  } else if (botao.dataset.acao === 'diminuir') {
    item.quantidade--;
    if (item.quantidade <= 0) {
      const posicao = carrinho.indexOf(item);
      carrinho.splice(posicao, 1);
    }
  }

  renderizarCarrinho();
  atualizarBarraCarrinho();
});
