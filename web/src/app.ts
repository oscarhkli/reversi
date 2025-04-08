const nameInput = document.getElementById("name") as HTMLInputElement;
const registerButton = document.getElementById("register") as HTMLButtonElement;
const hubElement = document.getElementById("hub") as HTMLDivElement;
const createRoomButton = document.getElementById(
  "createRoom"
) as HTMLButtonElement;
const boardElement = document.getElementById("board") as HTMLDivElement;
const startButton = document.getElementById("start") as HTMLButtonElement;
const leaveRoomButton = document.getElementById("leaveRoom") as HTMLButtonElement;
const roomElement = document.getElementById("room") as HTMLDivElement;
const serverUrl = "ws://localhost:8080/ws";

interface Player {
  id: string;
  name: string;
}

interface Point {
  x: number;
  y: number;
}

interface Room {
  roomUUID: string;
  name: string;
  count: number;
}

let socket: WebSocket;
let roomUUID: string | null;

const rooms = new Map<string, Room>();

const player: Player = {
  id: "",
  name: "",
};

enum MessageType {
  SendMessage = "SEND_MESSAGE",
  JoinRoom = "JOIN_ROOM",
  LeaveRoom = "LEAVE_ROOM",
  StartGame = "START_GAME",
  MakeMove = "MAKE_MOVE",
}

enum ServerMessageType {
  SendMessage = "SEND_MESSAGE",
  RoomUpdated = "ROOM_UPDATED",
  RegisterResponse = "REGISTER_RESPONSE",
  JoinRoomResponse = "JOIN_ROOM_RESPONSE",
  LeaveRoomResponse = "LEAVE_ROOM_RESPONSE",
  GameError = "GAME_ERROR",
  GameState = "GAME_STATE",
  GameResult = "GAME_RESULT",
}

type ServerMessage =
  | Message
  | RoomUpdatedMessage
  | RegisterResponseMessage
  | JoinRoomResponseMessage
  | LeaveRoomResponseMessage
  | GameErrorMessage
  | GameStateMessage;

interface Message {
  action: ServerMessageType.SendMessage;
  message: string;
  target: string;
}

interface RoomUpdatedMessage {
  action: ServerMessageType.RoomUpdated;
  message: {
    roomUUID: string;
    action: "ADDED" | "UPDATED" | "DELETED";
    name: string;
    count: number;
  };
  target: string;
}

interface RegisterResponseMessage {
  action: ServerMessageType.RegisterResponse;
  message: {
    id: string;
    name: string;
    rooms: Room[];
  };
}

interface JoinRoomRequestMessage {
  action: MessageType.JoinRoom;
  message: {
    roomUUID: string | null;
    name: string;
  };
}

interface LeaveRoomRequestMessage {
  action: MessageType.LeaveRoom;
  message: {
    roomUUID: string;
  };
}

interface StartGameMessage {
  action: MessageType.StartGame;
  message: {
    roomUUID: string;
  };
}

interface GameErrorMessage {
  action: ServerMessageType.GameError;
  message: string;
}

interface GameStatePlayer {
  id: string;
  name: string;
  token: number;
  score: number;
  possibleMoves: Point[];
}

interface GameStateMessage {
  action: ServerMessageType.GameState;
  message: {
    p1: GameStatePlayer;
    p2: GameStatePlayer;
    round: number;
    turn: number;
    currentPlayer: string; // player id
    board: [][];
  };
}

interface JoinRoomResponseMessage {
  action: ServerMessageType.JoinRoomResponse;
  message: {
    success: boolean;
    roomUUID: string;
    name: string;
  };
  target: string;
}

interface LeaveRoomResponseMessage {
  action: ServerMessageType.LeaveRoomResponse;
  message: {
    success: boolean;
    roomUUID: string;
  };
  target: string;
}

interface MakeMoveMessage {
  action: MessageType.MakeMove;
  message: {
    roomUUID: string;
    point: Point;
  };
}

function register() {
  const name = nameInput.value;
  if (!name) {
    return;
  }

  nameInput.disabled = true;
  registerButton.disabled = true;

  socket = new WebSocket(`${serverUrl}?name=${name}`);
  socket.onopen = () =>
    console.log("Socket conected with WebSocket state:", socket.readyState);

  socket.onmessage = (event) => {
    try {
      const resp: ServerMessage = JSON.parse(event.data);
      const handler = serverMessageHandler[resp.action as ServerMessageType];
      if (!handler) {
        console.error("Unknown message", event.data);
        return;
      }
      handler(resp);
    } catch (e) {
      console.error("Exception caught when handling event:", event.data, e);
    }
  };

  socket.onclose = () => console.log("Socket closed");
  socket.onerror = (error) => console.error("WebSocket error:", error);
}

const serverMessageHandler: Record<
  ServerMessageType,
  (msg: ServerMessage) => void
> = {
  [ServerMessageType.SendMessage]: (msg) =>
    handleServerGeneralMessage(msg as Message),
  [ServerMessageType.RoomUpdated]: (msg) =>
    handleRoomUpdatedMessage(msg as RoomUpdatedMessage),
  [ServerMessageType.RegisterResponse]: (msg) =>
    handleRegisterResponse(msg as RegisterResponseMessage),
  [ServerMessageType.JoinRoomResponse]: (msg) =>
    handleJoinRoomResponse(msg as JoinRoomResponseMessage),
  [ServerMessageType.LeaveRoomResponse]: (msg) =>
    handleLeaveRoomResponse(msg as LeaveRoomResponseMessage),
  [ServerMessageType.GameError]: (msg) =>
    handleGameError(msg as GameErrorMessage),
  [ServerMessageType.GameState]: (msg) =>
    handleGameState(msg as GameStateMessage),
  [ServerMessageType.GameResult]: (msg) => handleGameResult(msg as Message),
};

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

function handleRoomUpdatedMessage(resp: RoomUpdatedMessage) {
  const room: Room = {
    roomUUID: resp.message.roomUUID,
    name: resp.message.name,
    count: resp.message.count,
  };
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
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not connected.");
    return;
  }

  if (roomUUID) {
    console.error("Player is in a room. Cannot join another");
    return;
  }

  const message: JoinRoomRequestMessage = {
    action: MessageType.JoinRoom,
    message: {
      roomUUID: room.roomUUID,
      name: room.name,
    },
  };
  socket.send(JSON.stringify(message));
}

function handleDeleteRoom(room: Room) {
  rooms.delete(room.roomUUID);
}

function handleRegisterResponse(resp: RegisterResponseMessage) {
  player.id = resp.message.id;
  player.name = resp.message.name;

  const greetingNameLabel = document.getElementById("greetingName") as HTMLLabelElement;
  greetingNameLabel.textContent = player.name;

  const registrationElement = document.getElementById("registration") as HTMLDivElement;
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
  
  hubElement.hidden = true
  roomUUID = resp.message.roomUUID;
  renderEmptyBoard();
  roomElement.hidden = false;
}

function handleLeaveRoomResponse(resp: LeaveRoomResponseMessage) {
  if (roomUUID == resp.message.roomUUID) {
    roomUUID = null;
    roomElement.hidden = true;
    hubElement.hidden = false
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
  startButton.textContent = "Restart";
  startButton.disabled = false;
}

function createRoom() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not connected.");
    return;
  }

  const newRoomNameInput = document.getElementById(
    "newRoomName"
  ) as HTMLInputElement;
  let roomName = newRoomNameInput.value;
  if (!roomName) {
    roomName = "Untitled Room";
  }

  createRoomButton.disabled = true;
  const message: JoinRoomRequestMessage = {
    action: MessageType.JoinRoom,
    message: {
      name: roomName,
      roomUUID: null,
    },
  };
  socket.send(JSON.stringify(message));
}

function handleStartGameRequest() {
  if (!roomUUID) {
    console.error("Player isn't in any room");
    return;
  }
  const message: StartGameMessage = {
    action: MessageType.StartGame,
    message: {
      roomUUID: roomUUID,
    },
  };
  socket.send(JSON.stringify(message));
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

function isCurrentPlayer(resp: GameStateMessage) {
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
      const token = resp.message.board[i][j];
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
  if (!socket) {
    console.error("No socket connection established");
    return;
  }
  if (!roomUUID) {
    console.error("Player isn't in any room");
    return;
  }
  const msg: MakeMoveMessage = {
    action: MessageType.MakeMove,
    message: {
      roomUUID: roomUUID,
      point: {
        x: col,
        y: row,
      },
    },
  };
  socket.send(JSON.stringify(msg));
}

function handleLeaveRoomClick() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not connected.");
    return;
  }

  if (!roomUUID) {
    console.error("Player isn't in any room")
    return;
  }

  const message: LeaveRoomRequestMessage = {
    action: MessageType.LeaveRoom,
    message: {
      roomUUID: roomUUID,
    },
  };
  socket.send(JSON.stringify(message));
}

registerButton.onclick = register;
createRoomButton.onclick = createRoom;
startButton.onclick = handleStartGameRequest;
leaveRoomButton.onclick = handleLeaveRoomClick;
