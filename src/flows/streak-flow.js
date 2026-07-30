import { firstVisible, typeLikeHuman } from "../core/human.js";
import { escapeRegex, wait } from "../core/util.js";

/**
 * Único ponto do projeto que conhece o HTML do TikTok.
 * Se a automação parar de funcionar, quase sempre é aqui que se corrige:
 * cada entrada é uma lista de tentativas, da mais específica para a mais genérica.
 */
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

async function countBubbles(page) {
  for (const selector of SELECTORS.messageBubbles) {
    const total = await page.locator(selector).count();
    if (total > 0) {
      return { selector, total };
    }
  }
  return { selector: null, total: 0 };
}

export async function openMessagesInbox(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  if (page.url().toLowerCase().includes("/login")) {
    throw new Error("Redirecionado para a tela de login. Rode 'npm run login' novamente.");
  }
}

export async function openConversation(page, target, timeoutMs) {
  const pattern = new RegExp(escapeRegex(target), "i");
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const selector of SELECTORS.conversationItems) {
      const list = page.locator(selector);
      const conversation = list.filter({ hasText: pattern }).first();

      if (await conversation.isVisible().catch(() => false)) {
        await conversation.click();
        await firstVisible(page, SELECTORS.messageInput, timeoutMs, "Campo de mensagem");
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
 * Digita e envia a mensagem.
 * Retorna { confirmed } — false significa "enviado, mas não foi possível
 * verificar", e nunca dispara reenvio automático para evitar mensagem duplicada.
 */
export async function sendMessage(page, text, timeoutMs) {
  const input = await firstVisible(page, SELECTORS.messageInput, timeoutMs, "Campo de mensagem");

  await input.click();
  const reference = await countBubbles(page);

  await typeLikeHuman(page, text);
  await wait(300);
  await page.keyboard.press("Enter");

  if (await waitForDelivery(page, input, reference, 15_000)) {
    return { confirmed: true };
  }

  const remaining = (await input.innerText().catch(() => "")).trim();
  if (remaining) {
    // Enter não enviou nesta versão da interface: tenta o botão.
    const button = await firstVisible(page, SELECTORS.sendButton, 5_000, "Botão de enviar");
    await button.click();

    if (await waitForDelivery(page, input, reference, 15_000)) {
      return { confirmed: true };
    }
  }

  return { confirmed: false };
}

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
