// Print de diagnóstico: sempre que um envio falha ou não pode ser
// confirmado, um screenshot da página é salvo para facilitar o debug
// sem precisar reproduzir o problema ao vivo.

import fs from "node:fs/promises";
import path from "node:path";

import { log } from "./logger.js";

/** Remove caracteres que não são seguros para nome de arquivo. */
function safeName(label) {
  return label.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40);
}

/**
 * Salva um print da página em `dir`, com o horário no nome do arquivo.
 * Nunca lança erro: uma falha ao salvar o print não pode derrubar a
 * automação, que já está lidando com uma falha maior.
 */
export async function saveScreenshot(page, label, dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = path.join(dir, `${stamp}_${safeName(label)}.png`);
    await page.screenshot({ path: target, fullPage: false });
    log.info(`Print salvo em ${target}`);
    return target;
  } catch {
    return null;
  }
}
