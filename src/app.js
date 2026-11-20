import http from "node:http";

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

export function createApp({ storage = "firestore", setupRequired = true } = {}) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1:3000");
    const pathname = url.pathname;
    const method = req.method || "GET";

    if (method === "GET" && pathname === "/api/status") {
      return sendJson(res, 200, { setupRequired, storage });
    }

    const protectedRoutes = [
      ["GET", "/api/me"],
      ["POST", "/api/logout"],
      ["GET", "/api/records"],
      ["POST", "/api/calculate"],
      ["POST", "/api/records"],
      ["POST", "/api/import"],
      ["GET", "/api/audit"]
    ];

    const isProtected =
      protectedRoutes.some(([m, p]) => m === method && p === pathname) ||
      /^\/api\/records\/[^/]+$/.test(pathname);

    if (isProtected) {
      return sendJson(res, 401, { error: "No autenticado" });
    }

    return sendJson(res, 404, { error: "Ruta no encontrada" });
  });
}
