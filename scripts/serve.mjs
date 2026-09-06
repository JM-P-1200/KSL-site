import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    let relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    if (pathname !== "/" && !extname(relative)) {
      try {
        await stat(join(process.cwd(), `${relative}.html`));
        relative = `${relative}.html`;
      } catch {}
    }
    let file = normalize(join(process.cwd(), relative));
    if (!file.startsWith(process.cwd())) throw new Error("Invalid path");
    try {
      if ((await stat(file)).isDirectory()) relative = join(relative, "index.html");
    } catch {
      if (!extname(relative)) {
        const htmlRelative = `${relative}.html`;
        await stat(join(process.cwd(), htmlRelative));
        relative = htmlRelative;
      } else {
        throw new Error("Missing file");
      }
    }
    const body = await readFile(join(process.cwd(), relative));
    response.writeHead(200, { "Content-Type": types[extname(relative)] || "application/octet-stream", "Cache-Control": "no-cache" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile(join(process.cwd(), "404.html")));
  }
});
server.listen(port, "127.0.0.1", () => console.log(`KSL running at http://127.0.0.1:${port}`));
