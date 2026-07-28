import fs from "node:fs/promises";
import path from "node:path";

import { log } from "./logger.js";

function safeName(label) {
  return label.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40);
}

/** Salva um print da página para facilitar o diagnóstico quando algo falha. */
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
