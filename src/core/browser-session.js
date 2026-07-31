// Abertura do navegador em modo "perfil persistente": cookies e demais dados
// de sessão ficam salvos em disco, então o login manual só precisa acontecer
// uma vez (até a sessão expirar do lado do TikTok).

import fs from "node:fs/promises";

import { chromium } from "playwright";

// Flags que reduzem sinais óbvios de automação e evitam telas de primeira
// execução do navegador, que atrapalhariam um perfil rodando sem interação.
const DEFAULT_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--no-first-run",
  "--no-default-browser-check",
];

/**
 * Abre um contexto persistente do Playwright usando a pasta de perfil
 * definida em `config.profileDir`. Reaproveita a primeira aba já aberta
 * pelo Chromium em vez de criar uma nova.
 */
export async function openBrowser(config, { headless = config.headless } = {}) {
  await fs.mkdir(config.profileDir, { recursive: true });

  const options = {
    headless,
    args: [...DEFAULT_ARGS],
    locale: "pt-BR",
    // headless usa um viewport fixo; com janela visível, null deixa o
    // Playwright acompanhar o tamanho real da janela do sistema.
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
 * Verifica se existe uma sessão válida checando o cookie `sessionid` do
 * TikTok, em vez de inspecionar textos da interface, que mudam de idioma
 * e de versão com frequência.
 */
export async function isAuthenticated(context) {
  const cookies = await context.cookies("https://www.tiktok.com");
  return cookies.some((cookie) => cookie.name === "sessionid" && Boolean(cookie.value));
}

/**
 * Remove os cookies da sessão atual, mas mantém o restante do perfil
 * (cache, preferências). Útil para forçar um novo login sem apagar a pasta.
 */
export async function clearSession(context) {
  await context.clearCookies();
}
