const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "..", "public");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

module.exports = async function registerStaticRoutes(fastify) {
  fastify.get("/*", async (request, reply) => {
    const urlPath = (request.raw.url || "/").split("?")[0];
    const resolvedPath = urlPath === "/" ? "/index.html" : urlPath;
    const normalizedPath = path
      .normalize(resolvedPath)
      .replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(publicDir, normalizedPath);

    if (!filePath.startsWith(publicDir)) {
      return reply.code(403).send("Forbidden");
    }

    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      reply.type(mimeTypes[ext] || "application/octet-stream");
      return reply.send(data);
    } catch (error) {
      return reply.code(404).send("Not Found");
    }
  });
};
