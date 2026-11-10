import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  mime = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
  };
http
  .createServer(async (req, res) => {
    try {
      let file = path.resolve(
        root,
        "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
      );
      if (!file.startsWith(root + path.sep) && file !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      if ((await stat(file)).isDirectory())
        file = path.join(file, "index.html");
      res.setHeader(
        "Content-Type",
        mime[path.extname(file)] || "application/octet-stream",
      );
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4173, "0.0.0.0", () =>
    console.log("OitoGameLab: http://localhost:4173/play/"),
  );
