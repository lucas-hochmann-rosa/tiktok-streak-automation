import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(configDir, "..", "..");

dotenv.config({ path: path.join(ROOT_DIR, ".env"), quiet: true });

function getText(name, fallback = "") {
  const value = process.env[name];
  return value === undefined ? fallback : String(value).trim();
}

function getBool(name, fallback = false) {
  const value = getText(name).toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "sim", "on"].includes(value)) return true;
  if (["0", "false", "no", "nao", "off"].includes(value)) return false;
  return fallback;
}

function getInt(name, fallback) {
  const value = getText(name);
  if (!value) return fallback;

  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number) || number < 0) {
    throw new Error(`${name} inválido: "${value}". Informe um número inteiro em milissegundos.`);
  }
  return number;
}

function getList(name, separator, fallback = []) {
  const value = getText(name);
  if (!value) return fallback;

  const items = value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

function getPath(name, fallback) {
  const value = getText(name, fallback);
  return path.isAbsolute(value) ? value : path.resolve(ROOT_DIR, value);
}

function getRange(minName, maxName, minFallback, maxFallback) {
  const min = getInt(minName, minFallback);
  const max = getInt(maxName, maxFallback);

  if (max < min) {
    throw new Error(`${maxName} precisa ser maior ou igual a ${minName}.`);
  }

  return { min, max };
}

export function loadConfig() {
  const config = {
    targets: getList("TIKTOK_TARGETS", ","),
    messages: getList("TIKTOK_MESSAGES", "|", ["🔥"]),
    messagesUrl: getText("TIKTOK_MESSAGES_URL", "https://www.tiktok.com/messages?lang=pt-BR"),
    loginUrl: getText("TIKTOK_LOGIN_URL", "https://www.tiktok.com/login?lang=pt-BR"),

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

    dryRun: getBool("DRY_RUN", false),
    screenshotsDir: getPath("SCREENSHOT_DIR", "logs"),
  };

  return config;
}

export function validateForRun(config) {
  if (config.targets.length === 0) {
    throw new Error(
      "Nenhum destinatário configurado. Defina TIKTOK_TARGETS no .env " +
        "(nomes como aparecem na lista de conversas, separados por vírgula).",
    );
  }
}
