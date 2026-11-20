import { createApp } from "./app.js";

const HOST = "127.0.0.1";
const PORT = 3000;

const server = createApp({ storage: "firestore", setupRequired: true });

server.listen(PORT, HOST, () => {
  console.log(`Backend Nuam escuchando en http://${HOST}:${PORT}`);
});
