import { resolve } from "node:path";
import { createApp } from "./app.js";
import { createMemoryStore } from "./store.js";

const HOST = "127.0.0.1";
const PORT = Number(process.env.API_PORT || 3000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error("API_PORT debe ser un puerto válido.");

const file = resolve(process.env.NUAM_DATA_FILE || "data/nuam-demo.json");
const server = createApp({ store: createMemoryStore({ file }) });
server.listen(PORT, HOST, () => {
  console.log(`Backend Nuam escuchando en http://${HOST}:${PORT}`);
});
