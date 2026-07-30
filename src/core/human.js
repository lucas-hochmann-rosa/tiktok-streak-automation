import { wait, waitRange, chance } from "./util.js";

/**
 * Digita caractere a caractere com intervalo variável.
 * Colar o texto inteiro de uma vez é o comportamento que mais denuncia
 * automação — nenhuma pessoa escreve uma frase em zero milissegundo.
 * Array.from preserva emoji, que ocupam duas unidades UTF-16.
 */
export async function typeLikeHuman(page, text, pace) {
  for (const char of Array.from(text)) {
    // insertText dispara eventos reais de input: funciona com emoji e com React.
    await page.keyboard.insertText(char);
    await waitRange(pace.typing);

    // Hesitação ocasional entre palavras, como quem pensa no que escrever.
    if (char === " " && chance(0.2)) {
      await waitRange(pace.preSend);
    }
  }
}

/**
 * Procura o primeiro seletor visível de uma lista de tentativas.
 * Cada flow declara suas alternativas da mais específica para a mais genérica.
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
