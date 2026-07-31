// Ponto de entrada da CLI. Lê o comando passado em `process.argv` e delega
// para a função correspondente. Sem argumento, o comando padrão é `run`.

import { loadConfig, validateForRun } from "./src/config/settings.js";
import { clearSession, isAuthenticated, openBrowser } from "./src/core/browser-session.js";
import { log } from "./src/core/logger.js";
import { wait } from "./src/core/util.js";
import { StreakService } from "./src/services/streak-service.js";

// Tempo máximo esperando o usuário terminar o login manual (captcha/2FA
// incluídos) antes de desistir e pedir para rodar o comando de novo.
const MANUAL_LOGIN_TIMEOUT_MS = 10 * 60 * 1_000;

function showHelp() {
  console.log(`
tiktok-streak-automation

  npm start         Envia a mensagem diária para os destinatários de TIKTOK_TARGETS.
  npm run login     Abre o navegador para você entrar no TikTok uma única vez.
  npm run logout    Derruba a sessão salva (útil para forçar um login do zero).
  npm run help      Mostra esta mensagem.

Configuração: copie .env.example para .env e ajuste TIKTOK_TARGETS.
`);
}

/**
 * Fica checando o cookie de sessão a cada 2s até detectar o login ou
 * estourar o timeout. Se o usuário fechar a janela do navegador antes
 * disso, `isAuthenticated` lança erro e a função retorna false.
 */
async function waitForManualLogin(context) {
  const deadline = Date.now() + MANUAL_LOGIN_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      if (await isAuthenticated(context)) return true;
    } catch {
      // Navegador fechado manualmente pelo usuário.
      return false;
    }
    await wait(2_000);
  }

  return false;
}

/** Comando `login`: abre o navegador visível e espera o login manual. */
async function loginCommand(config) {
  const { context, page } = await openBrowser(config, { headless: false });

  try {
    if (await isAuthenticated(context)) {
      log.success("Já existe uma sessão válida neste perfil. Nada a fazer.");
      return true;
    }

    await page.goto(config.loginUrl, { waitUntil: "domcontentloaded" });
    log.info("Faça login na janela que abriu (senha, QR code, 2FA — como preferir).");
    log.info("A janela fecha sozinha assim que o login for detectado.");

    if (!(await waitForManualLogin(context))) {
      log.error("Login não detectado. Rode 'npm run login' de novo.");
      return false;
    }

    log.success(`Sessão salva em ${config.profileDir}`);
    log.info("Agora rode 'npm start' para enviar a mensagem diária.");
    return true;
  } finally {
    await context.close().catch(() => {});
  }
}

/** Comando `logout`: derruba a sessão salva, sem apagar o resto do perfil. */
async function logoutCommand(config) {
  const { context } = await openBrowser(config, { headless: true });

  try {
    await clearSession(context);
    log.success("Sessão derrubada. O próximo comando vai precisar de login.");
    return true;
  } finally {
    await context.close().catch(() => {});
  }
}

/** Comando `run`: valida a configuração e executa o envio do dia. */
async function runCommand(config) {
  validateForRun(config);
  const { success } = await new StreakService(config).run();
  return success;
}

const COMMANDS = {
  run: runCommand,
  login: loginCommand,
  logout: logoutCommand,
};

/** Lê o comando da linha de comando e despacha para a função correspondente. */
async function main() {
  const command = (process.argv[2] ?? "run").toLowerCase();

  if (["help", "ajuda", "--help", "-h"].includes(command)) {
    showHelp();
    return true;
  }

  const action = COMMANDS[command];
  if (!action) {
    log.error(`Comando desconhecido: "${command}".`);
    showHelp();
    return false;
  }

  return action(loadConfig());
}

main()
  .then((success) => {
    process.exitCode = success ? 0 : 1;
  })
  .catch((error) => {
    log.error(error?.message ?? String(error));

    // Mensagem mais clara para o erro mais comum: perfil já aberto em
    // outra instância do Playwright/navegador.
    if (/ProcessSingleton|profile.*use|SingletonLock/i.test(error?.message ?? "")) {
      log.info("O perfil já está aberto em outro processo. Feche a janela anterior e tente de novo.");
    }

    process.exitCode = 1;
  });
