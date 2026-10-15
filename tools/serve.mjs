import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
};
http
  .createServer(async (req, res) => {
    try {
      const file = path.resolve(
        root,
        "." +
          decodeURIComponent(
            new URL(req.url, "http://localhost").pathname,
          ).replace(/\/$/, "/index.html"),
      );
      if (!file.startsWith(root + path.sep) || file.includes(path.sep + ".")) {
        res.writeHead(403);
        return res.end();
      }
      const data = await fs.readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(Number(process.env.PORT || 8000), "127.0.0.1", () =>
    console.log("Preview: http://localhost:" + (process.env.PORT || 8000)),
  );
