// Lê e valida todas as variáveis de ambiente do projeto, aplicando os
// valores padrão documentados em .env.example. É o único módulo que
// conhece o nome exato de cada variável de ambiente.

import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const configDir = path.dirname(fileURLToPath(import.meta.url));

// Raiz do projeto, usada para resolver caminhos relativos (.env, perfil, logs).
export const ROOT_DIR = path.resolve(configDir, "..", "..");

dotenv.config({ path: path.join(ROOT_DIR, ".env"), quiet: true });

/** Lê uma variável de texto, com valor padrão caso não esteja definida. */
function getText(name, fallback = "") {
  const value = process.env[name];
  return value === undefined ? fallback : String(value).trim();
}

/** Lê uma variável booleana, aceitando variações em português e inglês. */
function getBool(name, fallback = false) {
  const value = getText(name).toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "sim", "on"].includes(value)) return true;
  if (["0", "false", "no", "nao", "off"].includes(value)) return false;
  return fallback;
}

/** Lê uma variável inteira (ex.: milissegundos), validando o formato. */
function getInt(name, fallback) {
  const value = getText(name);
  if (!value) return fallback;

  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number) || number < 0) {
    throw new Error(`${name} inválido: "${value}". Informe um número inteiro em milissegundos.`);
  }
  return number;
}

/** Lê uma lista separada por `separator` (ex.: TIKTOK_TARGETS por vírgula). */
function getList(name, separator, fallback = []) {
  const value = getText(name);
  if (!value) return fallback;

  const items = value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

/** Lê um caminho de arquivo/pasta, resolvendo relativo à raiz do projeto. */
function getPath(name, fallback) {
  const value = getText(name, fallback);
  return path.isAbsolute(value) ? value : path.resolve(ROOT_DIR, value);
}

/** Lê um par min/max (ex.: TYPING_MIN_MS/TYPING_MAX_MS) como uma faixa. */
function getRange(minName, maxName, minFallback, maxFallback) {
  const min = getInt(minName, minFallback);
  const max = getInt(maxName, maxFallback);

  if (max < min) {
    throw new Error(`${maxName} precisa ser maior ou igual a ${minName}.`);
  }

  return { min, max };
}

/** Monta o objeto de configuração completo a partir do .env atual. */
export function loadConfig() {
  const config = {
    // Quem recebe a mensagem e quais mensagens podem ser sorteadas.
    targets: getList("TIKTOK_TARGETS", ","),
    messages: getList("TIKTOK_MESSAGES", "|", ["🔥"]),
    messagesUrl: getText("TIKTOK_MESSAGES_URL", "https://www.tiktok.com/messages?lang=pt-BR"),
    loginUrl: getText("TIKTOK_LOGIN_URL", "https://www.tiktok.com/login?lang=pt-BR"),

    // Onde e como o navegador é aberto.
    profileDir: getPath("BROWSER_PROFILE_DIR", ".profile"),
    browserChannel: getText("BROWSER_CHANNEL", "msedge"),
    headless: getBool("HEADLESS", false),

    timeoutMs: getInt("TIMEOUT_MS", 45_000),

    // Ritmo humano: o objetivo não é ser lento, é não ser instantâneo.
    // Ação instantânea é a assinatura mais óbvia de automação.
    pace: {
      typing: getRange("TYPING_MIN_MS", "TYPING_MAX_MS", 90, 260),
      reading: getRange("READ_MIN_MS", "READ_MAX_MS", 1_800, 4_200),
      preSend: getRange("PRE_SEND_MIN_MS", "PRE_SEND_MAX_MS", 800, 2_000),
      betweenTargets: getRange("DELAY_MIN_MS", "DELAY_MAX_MS", 6_000, 18_000),
      startJitterMs: getInt("START_JITTER_MAX_MS", 0),
    },

    // Diagnóstico.
    dryRun: getBool("DRY_RUN", false),
    screenshotsDir: getPath("SCREENSHOT_DIR", "logs"),
  };

  return config;
}

/** Valida os campos obrigatórios para efetivamente enviar mensagens. */
export function validateForRun(config) {
  if (config.targets.length === 0) {
    throw new Error(
      "Nenhum destinatário configurado. Defina TIKTOK_TARGETS no .env " +
        "(nomes como aparecem na lista de conversas, separados por vírgula).",
    );
  }
}
