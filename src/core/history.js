// Histórico incremental das execuções, em formato JSON Lines (um objeto por
// linha). Cada execução só acrescenta uma linha ao final do arquivo — nunca
// precisa reescrever o que já existe, o que torna o log seguro mesmo se o
// processo for interrompido no meio de uma execução.

import fs from "node:fs/promises";
import path from "node:path";

/**
 * Acrescenta uma entrada ao arquivo de histórico, criando a pasta se
 * necessário. `entry` deve conter pelo menos `success` e `results`; o
 * timestamp é adicionado automaticamente.
 */
export async function recordRun(entry, filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  });

  await fs.appendFile(filePath, line + "\n", "utf8");
}
