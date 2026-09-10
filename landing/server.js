// Servidor estatico minimo, sin dependencias. Railway lo detecta como Node.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PAGINA = readFileSync(resolve(import.meta.dirname, "index.html"));
const PUERTO = Number(process.env.PORT || 3000);

createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    return res.end("ok");
  }
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=300",
  });
  res.end(PAGINA);
}).listen(PUERTO, "0.0.0.0", () => console.log(`landing en :${PUERTO}`));
