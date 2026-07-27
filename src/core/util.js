export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
