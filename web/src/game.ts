import {
  GameErrorMessage,
  GameStateMessage,
  JoinRoomRequestMessage,
  JoinRoomResponseMessage,
  LeaveRoomRequestMessage,
  LeaveRoomResponseMessage,
  MakeMoveMessage,
  Message,
  ClientMessageType,
  Player,
  Point,
  RegisterResponseMessage,
  Room,
  RoomUpdatedMessage,
  ServerMessageType,
  StartGameMessage,
} from "./definitions.js";
import { initWebSocket, registerHandler, sendSocketMessage as sendClientMessage } from "./websocket.js";

export const state = {
  player: {
    id: "",
    name: "",
  } as Player,
};

const nameInput = document.getElementById("name") as HTMLInputElement;
const registerButton = document.getElementById("register") as HTMLButtonElement;
const hubElement = document.getElementById("hub") as HTMLDivElement;
const createRoomButton = document.getElementById(
  "createRoom"
) as HTMLButtonElement;
const boardElement = document.getElementById("board") as HTMLDivElement;
const startButton = document.getElementById("start") as HTMLButtonElement;
const leaveRoomButton = document.getElementById(
  "leaveRoom"
) as HTMLButtonElement;
const roomElement = document.getElementById("room") as HTMLDivElement;
const serverUrl = "ws://localhost:8080/ws";

let roomUUID: string | null;

const rooms = new Map<string, Room>();

export const player: Player = {
  id: "",
  name: "",
};

export function register() {
  const name = nameInput.value;
  if (!name) {
    return;
  }

  nameInput.disabled = true;
  registerButton.disabled = true;

  initWebSocket(serverUrl, name);
}

export function initServerMessageHandlers() {
  registerHandler(ServerMessageType.SendMessage, (msg) =>
    handleServerGeneralMessage(msg as Message)
  );
  registerHandler(ServerMessageType.RoomUpdated, (msg) =>
    handleRoomUpdatedMessage(msg as RoomUpdatedMessage)
  );
  registerHandler(ServerMessageType.RegisterResponse, (msg) =>
    handleRegisterResponse(msg as RegisterResponseMessage)
  );
  registerHandler(ServerMessageType.JoinRoomResponse, (msg) =>
    handleJoinRoomResponse(msg as JoinRoomResponseMessage)
  );
  registerHandler(ServerMessageType.LeaveRoomResponse, (msg) =>
    handleLeaveRoomResponse(msg as LeaveRoomResponseMessage)
  );
  registerHandler(ServerMessageType.GameError, (msg) =>
    handleGameError(msg as GameErrorMessage)
  );
  registerHandler(ServerMessageType.GameState, (msg) =>
    handleGameState(msg as GameStateMessage)
  );
  registerHandler(ServerMessageType.GameResult, (msg) =>
    handleGameResult(msg as Message)
  );
}

function appendMessageLogs(msg: string) {
  const messageLogs = document.getElementById(
    "messageLogs"
  ) as HTMLTextAreaElement;
  messageLogs.scrollTop = messageLogs.scrollHeight;
  if (messageLogs.textContent) {
    messageLogs.textContent += "\n";
  }
  messageLogs.textContent += msg;
}

function handleServerGeneralMessage(resp: Message) {
  appendMessageLogs(resp.message);
}

function updateRoomControl(room: Room) {
  if (roomUUID !== room.roomUUID) {
    return;
  }
  const currentRoomCountLabel = document.getElementById(
    "currentRoomCount"
  ) as HTMLLabelElement;
  currentRoomCountLabel.textContent = room.count.toString();
  startButton.disabled = room.count != 2;
}

function handleRoomUpdatedMessage(resp: RoomUpdatedMessage) {
  const room: Room = {
    roomUUID: resp.message.roomUUID,
    name: resp.message.name,
    count: resp.message.count,
  };

  updateRoomControl(room);

  switch (resp.message.action) {
    case "ADDED":
    case "UPDATED":
      handleUpsertRoom(room);
      break;
    case "DELETED":
      handleDeleteRoom(room);
      break;
  }
}

function handleUpsertRoom(room: Room) {
  rooms.set(room.roomUUID, room);
  const roomsElement = document.getElementById("rooms") as HTMLDivElement;
  roomsElement.replaceChildren();
  roomsElement.innerHTML = "";

  for (const room of rooms.values()) {
    const roomSelectElement = document.createElement("div");
    roomSelectElement.className = "room";
    roomSelectElement.style.border = "1px solid #ccc";
    roomSelectElement.style.padding = "10px";
    roomSelectElement.style.margin = "5px";
    roomSelectElement.style.width = "100px";
    roomSelectElement.style.height = "50px";
    roomSelectElement.style.cursor = "pointer";

    const label = document.createElement("p");
    label.textContent = `${room.name}: ${room.count}/2`;
    roomSelectElement.appendChild(label);

    if (room.count == 2) {
      roomSelectElement.style.opacity = "0.5";
      roomSelectElement.style.pointerEvents = "none";
    } else {
      roomSelectElement.onclick = () => handleRoomClick(room);
    }

    roomsElement.appendChild(roomSelectElement);
  }
}

function handleRoomClick(room: Room) {
  if (roomUUID) {
    console.error("Player is in a room. Cannot join another");
    return;
  }

  const message: JoinRoomRequestMessage = {
    action: ClientMessageType.JoinRoom,
    message: {
      roomUUID: room.roomUUID,
      name: room.name,
    },
  };
  sendClientMessage(message);
}

function handleDeleteRoom(room: Room) {
  rooms.delete(room.roomUUID);
}

function handleRegisterResponse(resp: RegisterResponseMessage) {
  player.id = resp.message.id;
  player.name = resp.message.name;

  const greetingNameLabel = document.getElementById(
    "greetingName"
  ) as HTMLLabelElement;
  greetingNameLabel.textContent = player.name;

  const registrationElement = document.getElementById(
    "registration"
  ) as HTMLDivElement;
  registrationElement.hidden = true;
  const mainElement = document.getElementById("main") as HTMLDivElement;
  mainElement.hidden = false;

  resp.message.rooms
    .map((room) => ({
      roomUUID: room.roomUUID,
      name: room.name,
      count: room.count,
    }))
    .forEach(handleUpsertRoom);
}

function handleJoinRoomResponse(resp: JoinRoomResponseMessage) {
  const roomNameLabel = document.getElementById("roomName") as HTMLLabelElement;
  roomNameLabel.textContent = resp.message.name;

  hubElement.hidden = true;
  roomUUID = resp.message.roomUUID;
  renderEmptyBoard();
  roomElement.hidden = false;
}

function handleLeaveRoomResponse(resp: LeaveRoomResponseMessage) {
  if (roomUUID == resp.message.roomUUID) {
    roomUUID = null;
    roomElement.hidden = true;
    hubElement.hidden = false;
  } else {
    console.error("unrelated message", resp);
  }
}

function handleGameError(resp: GameErrorMessage) {
  console.error(resp.message);
}

function handleGameState(resp: GameStateMessage) {
  // TODO: use another event handler for start game response
  startButton.disabled = true;
  renderGameBoard(resp);
}

function handleGameResult(resp: Message) {
  if (!resp.message) {
    // Draw
    appendMessageLogs("Draw game!");
  } else if (resp.message == player.id) {
    appendMessageLogs("You win!");
  } else {
    appendMessageLogs("You lose!");
  }

  startButton.disabled = false;
}

export function createRoom() {
  const newRoomNameInput = document.getElementById(
    "newRoomName"
  ) as HTMLInputElement;
  let roomName = newRoomNameInput.value;
  if (!roomName) {
    roomName = "Untitled Room";
  }

  createRoomButton.disabled = true;
  const message: JoinRoomRequestMessage = {
    action: ClientMessageType.JoinRoom,
    message: {
      name: roomName,
      roomUUID: null,
    },
  };
  sendClientMessage(message);
}

export function handleStartGameRequest() {
  if (!roomUUID) {
    console.error("Player isn't in any room");
    return;
  }
  const message: StartGameMessage = {
    action: ClientMessageType.StartGame,
    message: {
      roomUUID: roomUUID,
    },
  };
  sendClientMessage(message);
}

function renderGameBoard(resp: GameStateMessage) {
  const p1Name = document.getElementById("p1Name") as HTMLLabelElement;
  p1Name.textContent = resp.message.p1.name;
  const p1Score = document.getElementById("p1Score") as HTMLLabelElement;
  p1Score.textContent = resp.message.p1.score.toString();
  const p2Name = document.getElementById("p2Name") as HTMLLabelElement;
  p2Name.textContent = resp.message.p2.name;
  const p2Score = document.getElementById("p2Score") as HTMLLabelElement;
  p2Score.textContent = resp.message.p2.score.toString();

  const p1 = document.getElementById("p1") as HTMLDivElement;
  const p2 = document.getElementById("p2") as HTMLDivElement;
  if (resp.message.currentPlayer == resp.message.p1.id) {
    p1.style.backgroundColor = "lightyellow";
    p2.style.backgroundColor = "white";
  } else {
    p1.style.backgroundColor = "white";
    p2.style.backgroundColor = "lightyellow";
  }

  const round = document.getElementById("round") as HTMLLabelElement;
  round.textContent = resp.message.round.toString();
  const turn = document.getElementById("turn") as HTMLLabelElement;
  turn.textContent = resp.message.turn.toString();
  renderBoard(resp);
}

function renderEmptyBoard() {
  boardElement.innerHTML = "";
  boardElement.hidden = false;
  for (let row = 0; row < 8; row++) {
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("board-row");
    for (let col = 0; col < 8; col++) {
      const cell = document.createElement("button");
      cell.classList.add("board-cell");
      cell.style.width = "50px";
      cell.style.height = "50px";
      cell.dataset.row = row.toString();
      cell.dataset.col = col.toString();
      cell.textContent = "";
      rowDiv.appendChild(cell);
    }
    boardElement.appendChild(rowDiv);
  }
  console.log("created");
}

export function isCurrentPlayer(resp: GameStateMessage) {
  console.log(resp.message.currentPlayer, player.id);
  console.log(resp.message.currentPlayer === player.id);
  return resp.message.currentPlayer === player.id;
}

function getBoardCell(i: number, j: number): HTMLButtonElement {
  return document.querySelector(
    `.board-cell[data-row="${i}"][data-col="${j}"]`
  ) as HTMLButtonElement;
}

function renderBoard(resp: GameStateMessage) {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const token = resp.message.board?.[i]?.[j];
      const cell = getBoardCell(i, j);
      cell.disabled = true;
      if (token == 1) {
        cell.style.backgroundColor = "Black";
      } else if (token == 2) {
        cell.style.backgroundColor = "White";
      } else {
        cell.style.backgroundColor = "DarkGreen";
      }
    }
  }
  if (!isCurrentPlayer(resp)) {
    return;
  }

  const possibleMoves: Point[] =
    resp.message.p1.id === player.id
      ? resp.message.p1.possibleMoves
      : resp.message.p2.possibleMoves;
  if (!possibleMoves) {
    return;
  }
  possibleMoves
    .map((move) => getBoardCell(move.y, move.x))
    .forEach((cell) => {
      cell.disabled = false;
      cell.style.backgroundColor = "RoyalBlue";
      cell.onclick = () =>
        handleCellClick(Number(cell.dataset.row), Number(cell.dataset.col));
    });
}

function handleCellClick(row: number, col: number) {
  if (!roomUUID) {
    console.error("Player isn't in any room");
    return;
  }
  const message: MakeMoveMessage = {
    action: ClientMessageType.MakeMove,
    message: {
      roomUUID: roomUUID,
      point: {
        x: col,
        y: row,
      },
    },
  };
  sendClientMessage(message);
}

export function handleLeaveRoomClick() {
  if (!roomUUID) {
    console.error("Player isn't in any room");
    return;
  }

  const message: LeaveRoomRequestMessage = {
    action: ClientMessageType.LeaveRoom,
    message: {
      roomUUID: roomUUID,
    },
  };
  sendClientMessage(message);
}

export function initButtonEvents() {
  registerButton.onclick = register;
  createRoomButton.onclick = createRoom;
  startButton.onclick = handleStartGameRequest;
  leaveRoomButton.onclick = handleLeaveRoomClick;
}


