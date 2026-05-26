import { io as Client } from "socket.io-client";
import { createChatServer } from "../server/index.js";

function waitForEvent(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

function connectClient(url) {
  const socket = Client(url, {
    transports: ["websocket"],
    reconnectionDelay: 0,
    forceNew: true,
  });

  return new Promise((resolve, reject) => {
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
    socket.on("error", reject);
  });
}

describe("Chat server", () => {
  let server;
  let port;
  let url;
  const clients = [];

  beforeEach(async () => {
    const chat = createChatServer();
    server = chat.httpServer;
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
    url = `http://localhost:${port}`;
  });

  afterEach(async () => {
    clients.forEach((client) => {
      if (client.connected) client.disconnect();
    });
    clients.length = 0;
    await new Promise((resolve) => server.close(resolve));
  });

  test("Deve enviar a mensagem de entrada e a lista de usuários", async () => {
    const client = await connectClient(url);
    clients.push(client);

    // Arrange
    const systemPromise = waitForEvent(client, "system");
    const usersPromise = waitForEvent(client, "users");

    // Act
    client.emit("join", "Alice");

    // Assert
    const systemMessage = await systemPromise;
    const usersList = await usersPromise;

    expect(systemMessage).toEqual("Alice entrou no chat");
    expect(usersList).toEqual(["Alice"]);
  });

  test("Deve transmitir mensagens com remetente, texto e timestamp", async () => {
    const clientA = await connectClient(url);
    const clientB = await connectClient(url);
    clients.push(clientA, clientB);

    // Arrange
    const joinA = waitForEvent(clientA, "system");
    const joinB = waitForEvent(clientB, "system");
    clientA.emit("join", "Alice");
    await Promise.all([joinA, joinB]);

    const messageA = waitForEvent(clientA, "message");
    const messageB = waitForEvent(clientB, "message");

    // Act
    clientA.emit("message", "Olá mundo");

    // Assert
    const receivedA = await messageA;
    const receivedB = await messageB;

    expect(receivedA).toHaveProperty("from", "Alice");
    expect(receivedA).toHaveProperty("text", "Olá mundo");
    expect(new Date(receivedA.at).toString()).not.toEqual("Invalid Date");
    expect(receivedB).toEqual(receivedA);
  });

  test("Deve recusar join sem nome", async () => {
    const client = await connectClient(url);
    clients.push(client);

    // Arrange
    const validationPromise = waitForEvent(client, "validation");

    // Act
    client.emit("join", "");

    // Assert
    const validationMessage = await validationPromise;
    expect(validationMessage).toEqual("Nome inválido. Use um nome não vazio.");
  });

  test("Deve recusar join com nome duplicado", async () => {
    const clientA = await connectClient(url);
    const clientB = await connectClient(url);
    clients.push(clientA, clientB);

    // Arrange
    const joinA = waitForEvent(clientA, "system");
    clientA.emit("join", "Alice");
    await joinA;
    const validationPromise = waitForEvent(clientB, "validation");

    // Act
    clientB.emit("join", "Alice");

    // Assert
    const validationMessage = await validationPromise;
    expect(validationMessage).toEqual("Nome já está em uso. Escolha outro nome.");
  });

  test("Deve recusar mensagem antes de entrar", async () => {
    const client = await connectClient(url);
    clients.push(client);

    // Arrange
    const validationPromise = waitForEvent(client, "validation");

    // Act
    client.emit("message", "Olá");

    // Assert
    const validationMessage = await validationPromise;
    expect(validationMessage).toEqual("Você precisa entrar no chat antes de enviar mensagens.");
  });

  test("should broadcast leave system message when a client disconnects", async () => {
    const clientA = await connectClient(url);
    const clientB = await connectClient(url);
    clients.push(clientA, clientB);

    // Arrange
    const aliceSystemA = waitForEvent(clientA, "system");
    const aliceSystemB = waitForEvent(clientB, "system");
    const aliceUsersA = waitForEvent(clientA, "users");
    const aliceUsersB = waitForEvent(clientB, "users");
    clientA.emit("join", "Alice");
    await Promise.all([aliceSystemA, aliceSystemB, aliceUsersA, aliceUsersB]);

    const bobSystemA = waitForEvent(clientA, "system");
    const bobSystemB = waitForEvent(clientB, "system");
    const bobUsersA = waitForEvent(clientA, "users");
    const bobUsersB = waitForEvent(clientB, "users");
    clientB.emit("join", "Bob");
    await Promise.all([bobSystemA, bobSystemB, bobUsersA, bobUsersB]);

    const leaveSystem = waitForEvent(clientB, "system");
    const leaveUsers = waitForEvent(clientB, "users");

    // Act
    clientA.disconnect();

    // Assert
    const message = await leaveSystem;
    const users = await leaveUsers;

    expect(message).toEqual("Alice saiu");
    expect(users).toEqual(["Bob"]);
  });
});
