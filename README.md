# Terminal Chat via Socket.IO

Chat em tempo real pelo terminal, construído com **Node.js**, **Socket.IO** e **Javascript**.

---

## Como funciona

A arquitetura é cliente-servidor clássica sobre um Socket.

```
[ cliente A ]  ──┐
[ cliente B ]  ──┼──▶  [ servidor ]  ──▶  broadcast para todos
[ cliente C ]  ──┘
```

O **servidor** fica escutando conexões. Quando um cliente envia uma mensagem, o servidor repassa para **todos** os conectados, incluindo o remetente. Toda a lógica de quem está online fica no servidor, num `Map` em memória.

O **cliente** lê o terminal linha por linha com `readline` e envia cada linha como um evento Socket.IO. Ao mesmo tempo, ouve eventos vindos do servidor e imprime no terminal.

### Fluxo de uma conexão

```
cliente conecta
    │
    ▼
servidor: evento "connection"
    │
cliente emite: "join" com seu nome
    │
    ▼
servidor salva { id, name } no Map de usuários
servidor emite para todos: "system" (fulano entrou)
servidor emite para todos: "users"  (lista atualizada)
    │
    ▼
cliente digita uma mensagem e aperta Enter
    │
cliente emite: "message" com o texto
    │
    ▼
servidor lê quem é o remetente pelo socket.id
servidor emite para todos: "message" { from, text, at }
    │
    ▼
todos os clientes recebem e imprimem no terminal
```

### Fluxo de desconexão

```
cliente fecha o terminal (ou cai a rede)
    │
    ▼
servidor: evento "disconnect" automático do Socket.IO
servidor remove o usuário do Map
servidor emite para todos: "system" (fulano saiu)
servidor emite para todos: "users"  (lista atualizada)
```

---

## Eventos Socket.IO

### Cliente → Servidor

| Evento    | Payload  | Descrição                 |
| --------- | -------- | ------------------------- |
| `join`    | `string` | Nome do usuário ao entrar |
| `message` | `string` | Texto de uma mensagem     |

### Servidor → Cliente(s)

| Evento    | Payload                                      | Enviado para | Descrição                    |
| --------- | -------------------------------------------- | ------------ | ---------------------------- |
| `system`  | `string`                                     | Todos        | Notificação de entrada/saída |
| `users`   | `string[]`                                   | Todos        | Lista de nomes online        |
| `message` | `{ from: string, text: string, at: string }` | Todos        | Mensagem de um usuário       |

O campo `at` é um ISO 8601 timestamp gerado no servidor (`new Date().toISOString()`).

## Pré-requisitos

- Node.js 18+
- npm

---

## Instalação

```bash
git clone <seu-repositorio>
cd chat-socket
npm install
```

---

## Como usar

### 1. Iniciar o servidor

```bash
npm run server
```

O servidor sobe na porta `3000` por padrão e escuta em `0.0.0.0`, ou seja, aceita conexões de qualquer IP na rede.

Para usar uma porta diferente:

```bash
PORT=4000 npm run start:server
```

### 2. Conectar um cliente

**Na mesma máquina:**

```bash
npm run start:client
```

**Em outra máquina na mesma rede:**

```bash
npm run start:client <IP_DO_SERVIDOR> 3000
```
