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
  const name = await ask("Seu nome: ");
  const socket = io(`http://${host}:${port}`);

  socket.on("connect", () => {
    console.log("Conectado!");
    socket.emit("join", name.trim());
  });

  socket.on("message", (message) => {
    console.log(`${message.from}: ${message.text}`);
  });

  socket.on("system", (message) => {
    console.log(`[Sistema] ${message}`);
  });

  terminal.on("line", (line) => {
    const text = line.trim();
    if (!text) return;

    socket.emit("message", text);
  });
}

main();
