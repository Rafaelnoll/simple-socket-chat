import { createInterface } from "readline";
import { io } from "socket.io-client";

const [, , host = "localhost", port = "3000"] = process.argv;

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((res) => terminal.question(question, res));
}

async function main() {
  let name = "";

  try {
    name = (await ask("Seu nome: ")).trim();
  } catch (error) {
    console.error("[Erro] Falha ao ler o nome:", error.message);
    terminal.close();
    process.exit(1);
  }

  if (!name) {
    console.error("[Erro] Nome inválido. Reinicie e informe um nome válido.");
    terminal.close();
    process.exit(1);
  }

  const socket = io(`http://${host}:${port}`);

  socket.on("connect", () => {
    console.log("Conectado!");
    socket.emit("join", name);
  });

  socket.on("connect_error", (error) => {
    console.error("[Erro] Não foi possível conectar ao servidor:", error.message);
    terminal.close();
    process.exit(1);
  });

  socket.on("validation", (message) => {
    console.error(`[Erro] ${message}`);
  });

  socket.on("message", (message) => {
    console.log(`${message.from}: ${message.text}`);
  });

  socket.on("system", (message) => {
    console.log(`[Sistema] ${message}`);
  });

  terminal.on("line", (line) => {
    const text = line.trim();
    if (!text) {
      console.log("[Aviso] Digite uma mensagem antes de enviar.");
      return;
    }

    socket.emit("message", text);
  });
}

main().catch((error) => {
  console.error("[Erro] Falha inesperada:", error.message);
  terminal.close();
  process.exit(1);
});
