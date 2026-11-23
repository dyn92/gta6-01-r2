// Tiny local playtest server for Palmshade Heat.
// Serves the game/ folder on port 8080 so the game can be opened in a
// browser during development. No dependencies beyond Node itself.
import { readFileSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const gameRoot = join(dirname(fileURLToPath(import.meta.url)), "game");
const PORT = 8080;
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

const server = createServer((req, res) => {
  const wanted = decodeURIComponent((req.url ?? "/").split("?")[0].split("#")[0]);
  const rel = normalize(wanted === "/" ? "/index.html" : wanted).replace(/^[/\\]+/, "");
  const filePath = join(gameRoot, rel);
  if (!filePath.startsWith(gameRoot) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(filePath)] ?? "application/octet-stream" });
  res.end(readFileSync(filePath));
});
server.listen(PORT, () => console.log(`Palmshade Heat at http://localhost:${PORT}/`));
