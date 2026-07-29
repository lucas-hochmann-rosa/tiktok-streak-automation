import { isAuthenticated, openBrowser } from "../core/browser-session.js";
import { saveScreenshot } from "../core/screenshots.js";
import { log } from "../core/logger.js";
import { pickRandom, randomInt, wait } from "../core/util.js";
import { openConversation, openMessagesInbox, sendMessage } from "../flows/streak-flow.js";

const STATUS = Object.freeze({
  SENT: "enviado",
  UNCONFIRMED: "não confirmado",
  SIMULATED: "simulado",
  FAILED: "falhou",
});

export class StreakService {
  constructor(config) {
    this.config = config;
  }

  async run() {
    const { context, page } = await openBrowser(this.config);

    try {
      if (!(await isAuthenticated(context))) {
        throw new Error(
          "Sessão ausente ou expirada. Rode 'npm run login' para entrar uma vez no navegador.",
        );
      }

      await openMessagesInbox(page, this.config.messagesUrl);
      log.success(`Sessão válida. ${this.config.targets.length} destinatário(s) na fila.`);

      const results = [];
      for (const [index, target] of this.config.targets.entries()) {
        if (index > 0) {
          await this.#delayBetweenTargets();
        }
        results.push(await this.#processTarget(page, target));
      }

      return this.#summarize(results);
    } finally {
      await context.close();
    }
  }

  async #processTarget(page, target) {
    try {
      await openConversation(page, target, this.config.timeoutMs);

      if (this.config.dryRun) {
        log.warn(`${target}: DRY_RUN ativo, conversa aberta mas nada foi enviado.`);
        return { target, status: STATUS.SIMULATED };
      }

      const message = pickRandom(this.config.messages);
      const { confirmed } = await sendMessage(page, message, this.config.timeoutMs);

      if (confirmed) {
        log.success(`${target}: enviado "${message}"`);
        return { target, status: STATUS.SENT, message };
      }

      log.warn(
        `${target}: mensagem "${message}" enviada, mas não foi possível confirmar na tela. ` +
          "Verifique manualmente antes de rodar de novo.",
      );
      await saveScreenshot(page, `unconfirmed-${target}`, this.config.screenshotsDir);
      return { target, status: STATUS.UNCONFIRMED, message };
    } catch (error) {
      log.error(`${target}: ${error.message}`);
      await saveScreenshot(page, `error-${target}`, this.config.screenshotsDir);
      return { target, status: STATUS.FAILED, error: error.message };
    }
  }

  async #delayBetweenTargets() {
    const delay = randomInt(this.config.delayMs.min, this.config.delayMs.max);
    log.info(`Aguardando ${delay}ms antes do próximo destinatário.`);
    await wait(delay);
  }

  #summarize(results) {
    const count = (status) => results.filter((item) => item.status === status).length;
    const failures = count(STATUS.FAILED);

    log.info(
      `Resumo: ${count(STATUS.SENT)} enviado(s), ` +
        `${count(STATUS.UNCONFIRMED)} não confirmado(s), ` +
        `${count(STATUS.SIMULATED)} simulado(s), ${failures} falha(s).`,
    );

    return { results, success: failures === 0 };
  }
}
