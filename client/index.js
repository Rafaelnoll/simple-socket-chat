import { createInterface } from "readline";
import { io } from "socket.io-client";
import chalk from "chalk";
import "dotenv/config";

const host = process.env.SERVER_HOST ?? "localhost";
const port = process.env.SERVER_PORT ?? "3000";
const protocol = host.includes("localhost") ? "http" : "https";

const terminal = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.cyan.bold("> "),
});

function ask(question) {
  return new Promise((res) => terminal.question(question, res));
}

function printChatLine(text) {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  console.log(text);
  terminal.prompt(true);
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function main() {
  let name = "";

  try {
    name = (await ask(chalk.bold("Seu nome: "))).trim();
  } catch (error) {
    console.error(chalk.red("[Erro] Falha ao ler o nome:"), error.message);
    terminal.close();
    process.exit(1);
  }

  if (!name) {
    console.error(
      chalk.red("[Erro] Nome inválido. Reinicie e informe um nome válido."),
    );
    terminal.close();
    process.exit(1);
  }

  const socket = io(`${protocol}://${host}`, { port: parseInt(port) });

  socket.on("connect", () => {
    console.log(
      chalk.green.bold("✓ Conectado!") + chalk.dim(` (${host}:${port})`),
    );
    terminal.prompt();
    socket.emit("join", name);
  });

  socket.on("connect_error", (error) => {
    console.error(
      chalk.red("[Erro] Não foi possível conectar:"),
      error.message,
    );
    terminal.close();
    process.exit(1);
  });

  socket.on("validation", (message) => {
    printChatLine(chalk.red(`[Erro] ${message}`));
  });

  socket.on("message", (message) => {
    const time = chalk.dim(formatTime(message.at));
    const isMe = message.from === name;

    const sender = isMe
      ? chalk.green.bold(message.from)
      : chalk.blue.bold(message.from);

    const text = isMe
      ? chalk.white(message.text)
      : chalk.whiteBright(message.text);

    printChatLine(`${time} ${sender}: ${text}`);
  });

  socket.on("system", (message) => {
    printChatLine(chalk.yellow.dim(`  ⬡ ${message}`));
  });

  socket.on("users", (users) => {
    const list = users
      .map((u) => (u === name ? chalk.green(u) : chalk.blue(u)))
      .join(chalk.dim(", "));
    printChatLine(chalk.dim("  online: ") + list);
  });

  terminal.on("line", (line) => {
    const text = line.trim();
    if (!text) {
      printChatLine(
        chalk.yellow.dim("[Aviso] Digite uma mensagem antes de enviar."),
      );
      return;
    }

    socket.emit("message", text);
    terminal.prompt();
  });
}

main().catch((error) => {
  console.error(chalk.red("[Erro] Falha inesperada:"), error.message);
  terminal.close();
  process.exit(1);
});
