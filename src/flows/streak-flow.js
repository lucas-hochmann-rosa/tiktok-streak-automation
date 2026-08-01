// Único módulo do projeto que conhece o HTML do TikTok: seletores da caixa
// de mensagens e a lógica de abrir uma conversa e enviar uma mensagem.
// Se a automação parar de funcionar, quase sempre é aqui que se corrige.

import { typeLikeHuman } from "../core/human.js";
import { firstVisible } from "../core/locator.js";
import { escapeRegex, wait, waitRange } from "../core/util.js";

// Cada campo é uma lista de tentativas, da mais específica (atributos
// próprios do TikTok, como data-e2e) para a mais genérica (papel ARIA
// ou classe CSS parcial), usada como último recurso.
export const SELECTORS = {
  conversationItems: [
    '[data-e2e="chat-list-item"]',
    'div[class*="DivItemWrapper"]',
    '[role="listitem"]',
  ],
  messageInput: [
    '[data-e2e="message-input-area"] div[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
  ],
  sendButton: ['[data-e2e="message-send"]', 'button[type="submit"]'],
  messageBubbles: ['[data-e2e="chat-item"]', 'div[class*="DivChatItemWrapper"]'],
};

/**
 * Conta quantas bolhas de mensagem existem na conversa atual, usando o
 * primeiro seletor da lista que retornar algum resultado. Serve como
 * "antes" para comparar com o "depois" e confirmar que a mensagem saiu.
 */
async function countBubbles(page) {
  for (const selector of SELECTORS.messageBubbles) {
    const total = await page.locator(selector).count();
    if (total > 0) {
      return { selector, total };
    }
  }
  return { selector: null, total: 0 };
}

/**
 * Navega até a caixa de mensagens do TikTok e confirma que a sessão ainda
 * é válida (o TikTok redireciona para /login quando a sessão expirou).
 */
export async function openMessagesInbox(page, url, pace) {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  if (page.url().toLowerCase().includes("/login")) {
    throw new Error("Redirecionado para a tela de login. Rode 'npm run login' novamente.");
  }

  // Tempo de a página assentar e de uma pessoa olhar a lista de conversas.
  await waitRange(pace.reading);
}

/**
 * Localiza e abre a conversa com `target` (busca por texto, sem diferenciar
 * maiúsculas/minúsculas). A lista de conversas é paginada e carrega mais
 * itens conforme rola, então a busca tenta, rola um pouco e tenta de novo
 * até encontrar ou estourar o timeout.
 */
export async function openConversation(page, target, timeoutMs, pace) {
  const pattern = new RegExp(escapeRegex(target), "i");
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const selector of SELECTORS.conversationItems) {
      const list = page.locator(selector);
      const conversation = list.filter({ hasText: pattern }).first();

      if (await conversation.isVisible().catch(() => false)) {
        await conversation.click();
        await firstVisible(page, SELECTORS.messageInput, timeoutMs, "Campo de mensagem");
        // Uma pessoa lê a conversa antes de responder.
        await waitRange(pace.reading);
        return;
      }

      // A lista é paginada: rola um pouco para carregar conversas mais antigas.
      if ((await list.count()) > 0) {
        await list.last().hover().catch(() => {});
        await page.mouse.wheel(0, 600).catch(() => {});
      }
    }
    await wait(400);
  }

  throw new Error(
    `Conversa com "${target}" não encontrada. Confira se o nome em TIKTOK_TARGETS ` +
      "é igual ao exibido na lista de conversas do TikTok.",
  );
}

/**
 * Digita e envia a mensagem na conversa aberta.
 *
 * Fluxo: clica no campo, digita com ritmo humano, pressiona Enter e espera
 * a entrega ser confirmada (nova bolha de mensagem ou campo esvaziado). Se
 * o Enter não enviar (algumas versões da interface exigem clicar no botão),
 * tenta o botão de enviar como segunda tentativa.
 *
 * Retorna { confirmed } — `false` significa "enviado, mas não foi possível
 * verificar visualmente", e o chamador nunca deve reenviar automaticamente
 * nesse caso, para evitar mensagem duplicada.
 */
export async function sendMessage(page, text, timeoutMs, pace) {
  const input = await firstVisible(page, SELECTORS.messageInput, timeoutMs, "Campo de mensagem");

  await input.click();
  await waitRange(pace.preSend);

  // Guarda o estado da conversa antes de digitar, para comparar depois.
  const reference = await countBubbles(page);

  await typeLikeHuman(page, text, pace);
  await waitRange(pace.preSend);
  await page.keyboard.press("Enter");

  if (await waitForDelivery(page, input, reference, 15_000)) {
    return { confirmed: true };
  }

  // Se o campo ainda tem texto, o Enter provavelmente não enviou: tenta o botão.
  const remaining = (await input.innerText().catch(() => "")).trim();
  if (remaining) {
    const button = await firstVisible(page, SELECTORS.sendButton, 5_000, "Botão de enviar");
    await waitRange(pace.preSend);
    await button.click();

    if (await waitForDelivery(page, input, reference, 15_000)) {
      return { confirmed: true };
    }
  }

  return { confirmed: false };
}

/**
 * Espera até `timeoutMs` por um sinal de que a mensagem foi entregue: ou
 * uma nova bolha apareceu na conversa, ou o campo de digitação esvaziou.
 */
async function waitForDelivery(page, input, reference, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (reference.selector) {
      const total = await page.locator(reference.selector).count();
      if (total > reference.total) return true;
    } else {
      const content = (await input.innerText().catch(() => "")).trim();
      if (!content) return true;
    }
    await wait(300);
  }

  return false;
}
