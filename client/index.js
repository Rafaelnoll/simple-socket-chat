import { createInterface } from "readline";
import { io } from "socket.io-client";

const [, , host = "localhost", port = "3000"] = process.argv;

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

function ask(question) {
  return new Promise((res) => terminal.question(question, res));
}

// Imprime uma linha nova no chat sem quebrar o prompt atual.
// Limpa a linha atual, exibe a mensagem e reexibe o prompt.
function printChatLine(text) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log(text);
  terminal.prompt(true);
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
    terminal.prompt();
    socket.emit("join", name);
  });

  socket.on("connect_error", (error) => {
    console.error("[Erro] Não foi possível conectar ao servidor:", error.message);
    terminal.close();
    process.exit(1);
  });

  socket.on("validation", (message) => {
    printChatLine(`[Erro] ${message}`);
  });

  socket.on("message", (message) => {
    printChatLine(`${message.from}: ${message.text}`);
  });

  socket.on("system", (message) => {
    printChatLine(`[Sistema] ${message}`);
  });

  terminal.on("line", (line) => {
    const text = line.trim();
    if (!text) {
      printChatLine("[Aviso] Digite uma mensagem antes de enviar.");
      return;
    }

    socket.emit("message", text);
    terminal.prompt();
  });
}

main().catch((error) => {
  console.error("[Erro] Falha inesperada:", error.message);
  terminal.close();
  process.exit(1);
});
