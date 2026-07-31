// Funções utilitárias genéricas, sem dependência do Playwright.
// Usadas pelo restante do projeto para pausas, sorteio e escape de regex.

/** Espera `ms` milissegundos antes de resolver a Promise. */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sorteia um número inteiro entre `min` e `max`, ambos inclusivos. */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Espera um tempo sorteado dentro da faixa { min, max }. */
export function waitRange(range) {
  return wait(randomInt(range.min, range.max));
}

/** Retorna um item aleatório de uma lista (usado para sortear a mensagem). */
export function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

/** Retorna true com a probabilidade informada (0 a 1). */
export function chance(probability) {
  return Math.random() < probability;
}

/** Escapa caracteres especiais de regex, para usar texto livre em new RegExp(). */
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
