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
    await this.#startJitter();

    const { context, page } = await openBrowser(this.config);

    try {
      if (!(await isAuthenticated(context))) {
        throw new Error(
          "Sessão ausente ou expirada. Rode 'npm run login' para entrar uma vez no navegador.",
        );
      }

      await openMessagesInbox(page, this.config.messagesUrl, this.config.pace);
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
      await openConversation(page, target, this.config.timeoutMs, this.config.pace);

      if (this.config.dryRun) {
        log.warn(`${target}: DRY_RUN ativo, conversa aberta mas nada foi enviado.`);
        return { target, status: STATUS.SIMULATED };
      }

      const message = pickRandom(this.config.messages);
      const { confirmed } = await sendMessage(page, message, this.config.timeoutMs, this.config.pace);

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
    const { betweenTargets } = this.config.pace;
    const delay = randomInt(betweenTargets.min, betweenTargets.max);
    log.info(`Aguardando ${Math.round(delay / 1000)}s antes do próximo destinatário.`);
    await wait(delay);
  }

  /**
   * Execução agendada dispara sempre no mesmo segundo, o que é um padrão
   * fácil de notar. Um atraso aleatório no início quebra essa regularidade.
   */
  async #startJitter() {
    const cap = this.config.pace.startJitterMs;
    if (cap <= 0) return;

    const delay = randomInt(0, cap);
    log.info(`Atraso inicial de ${Math.round(delay / 1000)}s.`);
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
