export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Espera um tempo sorteado dentro da faixa { min, max }. */
export function waitRange(range) {
  return wait(randomInt(range.min, range.max));
}

export function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function chance(probability) {
  return Math.random() < probability;
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
