import { createServer } from "http";
import { Server, Socket } from "socket.io";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: "*" } });

const users = new Map();

io.on("connection", (socket) => {
  socket.on("join", (name) => {
    users.set(socket.id, { id: socket.id, name });
    io.emit("system", `${name} entrou no chat`);
    io.emit(
      "users",
      Array.from(users.values()).map((u) => u.name),
    );
  });

  socket.on("message", (text) => {
    const user = users.get(socket.id);
    if (!user) return;
    io.emit("message", { from: user.name, text, at: new Date().toISOString() });
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

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
