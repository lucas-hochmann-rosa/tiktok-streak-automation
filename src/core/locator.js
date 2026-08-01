// Busca resiliente de elementos na página: tentativas em cadeia contra uma
// lista de seletores, até um ficar visível ou o timeout estourar. Separado
// de human.js porque aqui não há nada de "comportamento humano" — é só
// tolerância a pequenas mudanças de layout do TikTok.

import { wait } from "./util.js";

/**
 * Procura o primeiro seletor visível de uma lista de tentativas, tentando
 * repetidamente até o timeout. Cada flow declara suas alternativas da mais
 * específica para a mais genérica, o que torna a busca resiliente a
 * pequenas mudanças de layout do TikTok.
 */
export async function firstVisible(page, selectors, timeoutMs, description) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        return locator;
      }
    }
    await wait(250);
  }

  throw new Error(`${description} não encontrado(a) na página. Ajuste os seletores do flow correspondente.`);
}
