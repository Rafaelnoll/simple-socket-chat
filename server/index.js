import { createServer } from "http";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

function isValidText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function createChatServer() {
  const httpServer = createServer();
  const io = new Server(httpServer, { cors: { origin: "*" } });
  const users = new Map();

  io.on("connection", (socket) => {
    socket.on("join", (name) => {
      if (!isValidText(name)) {
        socket.emit("validation", "Nome inválido. Use um nome não vazio.");
        return;
      }

      const trimmedName = name.trim();
      const duplicate = Array.from(users.values()).some((user) => user.name === trimmedName);
      if (duplicate) {
        socket.emit("validation", "Nome já está em uso. Escolha outro nome.");
        return;
      }

      users.set(socket.id, { id: socket.id, name: trimmedName });
      io.emit("system", `${trimmedName} entrou no chat`);
      io.emit(
        "users",
        Array.from(users.values()).map((u) => u.name),
      );
    });

    socket.on("message", (text) => {
      const user = users.get(socket.id);
      if (!user) {
        socket.emit("validation", "Você precisa entrar no chat antes de enviar mensagens.");
        return;
      }

      if (!isValidText(text)) {
        socket.emit("validation", "Mensagem inválida. Digite um texto não vazio.");
        return;
      }

      const trimmedText = text.trim();
      io.emit("message", { from: user.name, text: trimmedText, at: new Date().toISOString() });
    });

    socket.on("disconnect", () => {
      const user = users.get(socket.id);
      if (!user) return;
      users.delete(socket.id);
      io.emit("system", `${user.name} saiu`);
      io.emit(
        "users",
        Array.from(users.values()).map((u) => u.name),
      );
    });
  });

  return { httpServer, io, users };
}

const __filename = fileURLToPath(import.meta.url);
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

if (process.argv[1] === __filename) {
  const { httpServer } = createChatServer();
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}
