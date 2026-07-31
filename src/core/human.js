// Funções que simulam comportamento humano na interação com a página:
// digitação com ritmo variável e busca de elementos com tentativas.
// Usado tanto pelo fluxo de envio quanto por qualquer flow futuro que
// precise de interação "natural" com o TikTok.

import { wait, waitRange, chance } from "./util.js";

/**
 * Digita um texto caractere a caractere, com um intervalo sorteado a cada
 * tecla (`pace.typing`). Colar o texto inteiro de uma vez é o comportamento
 * que mais denuncia automação — nenhuma pessoa escreve uma frase em zero
 * milissegundo.
 *
 * `Array.from` percorre por code point, então emoji (que ocupam duas
 * unidades UTF-16) são tratados como um único "caractere" digitado.
 */
export async function typeLikeHuman(page, text, pace) {
  for (const char of Array.from(text)) {
    // insertText dispara eventos reais de input: funciona com emoji e com
    // frameworks que escutam o evento `input` (como o React).
    await page.keyboard.insertText(char);
    await waitRange(pace.typing);

    // Hesitação ocasional após um espaço, como quem pensa na próxima palavra.
    if (char === " " && chance(0.2)) {
      await waitRange(pace.preSend);
    }
  }
}

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
