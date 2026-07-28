import fs from "node:fs/promises";

import { chromium } from "playwright";

const DEFAULT_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--no-first-run",
  "--no-default-browser-check",
];

/**
 * Abre um contexto persistente: cookies e sessão ficam salvos em disco,
 * então o login manual precisa ser feito apenas uma vez.
 */
export async function openBrowser(config, { headless = config.headless } = {}) {
  await fs.mkdir(config.profileDir, { recursive: true });

  const options = {
    headless,
    args: [...DEFAULT_ARGS],
    locale: "pt-BR",
    viewport: headless ? { width: 1366, height: 900 } : null,
  };

  if (config.browserChannel) {
    options.channel = config.browserChannel;
  }
  if (!headless) {
    options.args.push("--start-maximized");
  }

  const context = await chromium.launchPersistentContext(config.profileDir, options);
  context.setDefaultTimeout(config.timeoutMs);
  context.setDefaultNavigationTimeout(config.timeoutMs);

  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page };
}

/**
 * Verifica o cookie de sessão do TikTok em vez de inspecionar textos da
 * interface, que mudam de idioma e de versão.
 */
export async function isAuthenticated(context) {
  const cookies = await context.cookies("https://www.tiktok.com");
  return cookies.some((cookie) => cookie.name === "sessionid" && Boolean(cookie.value));
}

/** Derruba a sessão mantendo o perfil: útil para forçar um login do zero. */
export async function clearSession(context) {
  await context.clearCookies();
}
