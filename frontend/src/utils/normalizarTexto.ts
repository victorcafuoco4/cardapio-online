// Normaliza texto pra comparação de busca: minúsculo e sem acento.
// NFD separa a letra do acento (ex: "e" + acento agudo combinável); o replace
// descarta só o intervalo Unicode dos acentos ("combining diacritical marks").
const ACENTOS = /[̀-ͯ]/g;

export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(ACENTOS, '').toLowerCase();
}
