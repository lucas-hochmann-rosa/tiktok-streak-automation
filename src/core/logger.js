// Logger simples: prefixa cada linha com o horário atual e um símbolo por
// nível, para facilitar a leitura do console durante execuções agendadas.

/** Formata o horário atual no padrão 24h (pt-BR). */
function timestamp() {
  return new Date().toLocaleTimeString("pt-BR", { hour12: false });
}

/** Escreve uma linha de log no stream informado (console.log ou console.error). */
function write(stream, symbol, message) {
  stream(`[${timestamp()}] ${symbol} ${message}`);
}

// Cada método corresponde a um nível de log, com seu próprio símbolo visual.
export const log = {
  info: (message) => write(console.log, "·", message),
  success: (message) => write(console.log, "+", message),
  warn: (message) => write(console.warn, "!", message),
  error: (message) => write(console.error, "x", message),
};
