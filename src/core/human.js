// Simula digitação humana na página: ritmo variável caractere a caractere,
// em vez de inserir o texto inteiro de uma vez.

import { waitRange, chance } from "./util.js";

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
