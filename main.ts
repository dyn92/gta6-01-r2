// Palmshade Heat — entrypoint for the make.fun grader.
// Written for this entry: it stages the playable game plus its screenshots
// into the output folder, asks the vendored dossier builder to describe
// them, and then double-checks its own work before reporting success.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const rootHere = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const SHOT_LIMIT = 256 * 1024;

function listShots(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder).filter((n) => /\.(jpe?g|png)$/i.test(n)).sort();
}

function auditShots(folder: string): void {
  const names = listShots(folder);
  if (names.length < 3 || names.length > 4) {
    throw new Error(`expected 3 or 4 screenshots, found ${names.length}`);
  }
  for (const name of names) {
    const size = statSync(join(folder, name)).size;
    if (size === 0 || size > SHOT_LIMIT) {
      throw new Error(`screenshot ${name} is ${size} bytes, outside the allowed range`);
    }
    console.log(`shot ok: ${name} (${size} bytes)`);
  }
}

mkdirSync(outDir, { recursive: true });
for (const part of ["game", "screenshots"]) {
  const from = join(rootHere, part);
  if (!existsSync(from)) throw new Error(`missing ${part}/ next to main.ts`);
  cpSync(from, join(outDir, part), { recursive: true });
  console.log(`staged ${part}/ -> ${join(outDir, part)}`);
}
auditShots(join(rootHere, "screenshots"));

const dossierBytes = buildDossier(rootHere, {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: SHOT_LIMIT },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
});
writeFileSync(join(outDir, "dossier.json"), dossierBytes);
console.log(`dossier.json written: ${dossierBytes.length} bytes -> ${outDir}`);
