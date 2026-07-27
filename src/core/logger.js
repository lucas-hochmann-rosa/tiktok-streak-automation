function timestamp() {
  return new Date().toLocaleTimeString("pt-BR", { hour12: false });
}

function write(stream, symbol, message) {
  stream(`[${timestamp()}] ${symbol} ${message}`);
}

export const log = {
  info: (message) => write(console.log, "·", message),
  success: (message) => write(console.log, "+", message),
  warn: (message) => write(console.warn, "!", message),
  error: (message) => write(console.error, "x", message),
};
