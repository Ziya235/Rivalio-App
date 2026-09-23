import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const indexFile = path.join(distDir, "index.html");
const port = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function resolveSafePath(urlPath) {
  const pathname = decodeURIComponent((urlPath ?? "/").split("?")[0]);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const absolutePath = path.normalize(path.join(distDir, relativePath));
  if (!absolutePath.startsWith(distDir)) return null;
  return absolutePath;
}

async function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(res);
}

async function sendIndex(res) {
  const html = await readFile(indexFile);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache",
  });
  res.end(html);
}

const server = createServer(async (req, res) => {
  const filePath = resolveSafePath(req.url);

  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      await sendFile(res, filePath);
      return;
    }
  } catch {
    // Missing files fall through to the SPA index for client-side routes.
  }

  const hasAssetExtension = Boolean(path.extname(filePath)) && !filePath.endsWith(".html");
  if (hasAssetExtension) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  try {
    await sendIndex(res);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("index.html is missing. Run npm run build first.");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`SPA server listening on ${port}`);
});
