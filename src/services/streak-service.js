// Orquestra a execução completa: abre o navegador, confirma a sessão e
// percorre a lista de destinatários chamando o fluxo de envio para cada um.
// É o único ponto que sabe "o que fazer" — o "como fazer" fica em
// src/flows/streak-flow.js.

import { isAuthenticated, openBrowser } from "../core/browser-session.js";
import { saveScreenshot } from "../core/screenshots.js";
import { log } from "../core/logger.js";
import { pickRandom, randomInt, wait } from "../core/util.js";
import { openConversation, openMessagesInbox, sendMessage } from "../flows/streak-flow.js";

// Status possíveis de cada destinatário ao final da execução.
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

  /**
   * Ponto de entrada principal: abre o navegador, verifica a sessão e envia
   * a mensagem para cada destinatário configurado. Retorna um resumo com o
   * resultado de cada um e uma flag `success` (false se houve alguma falha).
   */
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
        // Não há pausa antes do primeiro destinatário: a leitura da caixa
        // de mensagens já cumpriu esse papel em openMessagesInbox.
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

  /**
   * Processa um único destinatário: abre a conversa, sorteia uma mensagem
   * e envia. Qualquer erro é capturado aqui para não interromper os demais
   * destinatários da fila, e gera um print de diagnóstico em `logs/`.
   */
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

      // Enviado mas não confirmado: nunca reenviar aqui, para não duplicar.
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

  /** Pausa aleatória entre o envio de um destinatário e o próximo. */
  async #delayBetweenTargets() {
    const { betweenTargets } = this.config.pace;
    const delay = randomInt(betweenTargets.min, betweenTargets.max);
    log.info(`Aguardando ${Math.round(delay / 1000)}s antes do próximo destinatário.`);
    await wait(delay);
  }

  /**
   * Execução agendada dispara sempre no mesmo segundo, o que é um padrão
   * fácil de notar. Um atraso aleatório no início (START_JITTER_MAX_MS)
   * quebra essa regularidade. Desligado por padrão (cap = 0).
   */
  async #startJitter() {
    const cap = this.config.pace.startJitterMs;
    if (cap <= 0) return;

    const delay = randomInt(0, cap);
    log.info(`Atraso inicial de ${Math.round(delay / 1000)}s.`);
    await wait(delay);
  }

  /** Agrega os resultados individuais em um resumo e loga a contagem final. */
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
