const nameInput = document.getElementById("name") as HTMLInputElement;
const registerButton = document.getElementById("register") as HTMLButtonElement;
// const hubElement = document.getElementById("hub") as HTMLDivElement;
const roomsElement = document.getElementById("rooms") as HTMLDivElement;
const createRoomButton = document.getElementById("createRoom") as HTMLButtonElement;
// const joinButton = document.getElementById("join") as HTMLButtonElement;
const boardElement = document.getElementById("board") as HTMLDivElement;

const serverUrl = "ws://localhost:8080/ws";

interface GameState {
  board: number[][];
  turn: number;
  currentPlayer: string;
}

interface Player {
  id: string;
  name: string;
  score: number;
  possibleMoves: Point[];
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
let currentGameState: GameState;
let roomUUID: string;

const rooms = new Map<string, Room>();

const player: Player = {
  id: "",
  name: "",
  score: 0,
  possibleMoves: [],
};

function createBoard() {
  boardElement.innerHTML = "";
  for (let row = 0; row < 8; row++) {
    const rowDiv = document.createElement("div")
    for (let col = 0; col < 8; col++) {
      const cell = document.createElement("button");
      cell.style.width = "100px";
      cell.style.height = "100px";
      cell.dataset.row = row.toString();
      cell.dataset.col = col.toString();
      cell.textContent = "";
      cell.onclick = () => handleCellClick(row, col);
      rowDiv.appendChild(cell);
    }
    boardElement.appendChild(rowDiv);
  }
  console.log("created");
}

enum MessageType {
	SendMessage = "SEND_MESSAGE",
	JoinRoom = "JOIN_ROOM",
	LeaveRoom = "LEAVE_ROOM",
  MakeMove = "MAKE_MOVE"
}

enum ServerMessageType {
	SendMessage = "SEND_MESSAGE",
  RoomUpdated = "ROOM_UPDATED",
  RegisterResponse = "REGISTER_RESPONSE",
  JoinRoomResponse = "JOIN_ROOM_RESPONSE",
}

type ServerMessage = Message
  | RoomUpdatedMessage
  | RegisterResponseMessage
  | JoinRoomResponseMessage;

interface Message {
  action: ServerMessageType.SendMessage;
  message: string;
  target: string;
  sender: string;
}

interface RoomUpdatedMessage {
  action: ServerMessageType.RoomUpdated;
  message: {
    roomUUID: string;
    action: "ADDED" | "UPDATED" | "DELETED";
    name: string;
    count: number;
  }
  target: string;
  sender: string;
}

interface RegisterResponseMessage {
  action: ServerMessageType.RegisterResponse;
  message: {
    id: string;
    rooms: Room[]
  };
}

interface JoinRoomRequestMessage {
  action: MessageType.JoinRoom;
  message: {
    roomUUID: string | null;
    name: string;
  };
  target: string;
  sender: string;
}

interface JoinRoomResponseMessage {
  action: ServerMessageType.JoinRoomResponse;
  message: {
    success: boolean;
    roomUUID: string;
  };
  target: string;
  sender: string;
}

interface MakeMoveMessage {
  action: MessageType.MakeMove;
  message: {
    row: number;
    col: number;
  };
  target: string;
  sender: string;
}

function handleCellClick(row: number, col: number) {
  if (currentGameState.board[row][col] == 0 && socket) {
    const msg: MakeMoveMessage = {
      action: MessageType.MakeMove,
      message: {
        row: row,
        col: col,
      },
      target: "server",
      sender: player.id,
    }
    socket.send(JSON.stringify(msg));
  }
}

function register() {
  const name = nameInput.value;
  if (name) {
    socket = new WebSocket(`${serverUrl}?name=${name}`);
    socket.onopen = () => console.log("Socket conected with WebSocket state:", socket.readyState);

    socket.onmessage = (event) => {
      try {
        const resp: ServerMessage = JSON.parse(event.data);
        const handler = serverMessageHandler[resp.action as ServerMessageType];
        if (!handler) {
          console.error("Unknown message", event.data);
          return;
        }
        handler(resp);
      } catch(e) {
        console.error("Exception caught when handling event:", event.data, e);
      }
    };

    socket.onclose = () => console.log("Socket closed");
    socket.onerror = (error) => console.error("WebSocket error:", error);
  }
}

const serverMessageHandler: Record<ServerMessageType, (msg: ServerMessage) => void> = {
  [ServerMessageType.SendMessage]: (msg) => handleServerGeneralMessage(msg as Message),
  [ServerMessageType.RoomUpdated]: (msg) => handleRoomUpdatedMessage(msg as RoomUpdatedMessage),
  [ServerMessageType.RegisterResponse]: (msg) => handleRegisterResponse(msg as RegisterResponseMessage),
  [ServerMessageType.JoinRoomResponse]: (msg) => handleJoinRoomResponse(msg as JoinRoomResponseMessage),
}

function handleServerGeneralMessage(resp: Message) {
  console.log(resp);
}

function handleRoomUpdatedMessage(resp: RoomUpdatedMessage) {
  const room: Room = {
    roomUUID: resp.message.roomUUID,
    name: resp.message.name,
    count: resp.message.count
  }
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
  roomsElement.replaceChildren();
  roomsElement.innerHTML = "";

  for (const room of rooms.values()) {
    const roomElement = document.createElement("div")
    roomElement.className = "room";
    roomElement.style.border = '1px solid #ccc';
    roomElement.style.padding = '10px';
    roomElement.style.margin = '5px';
    roomElement.style.width = "100px";
    roomElement.style.height = "50px";
    roomElement.style.cursor = "pointer";

    const label = document.createElement("p");
    label.textContent = `${room.name}: ${room.count}/2`;
    roomElement.appendChild(label)

    if (room.count == 2) {
      roomElement.style.opacity = "0.5";
      roomElement.style.pointerEvents = "none";
    } else {
      roomElement.onclick = () => handleRoomClick(room);
    }

    roomsElement.appendChild(roomElement);
  }
}

function handleRoomClick(room: Room) {
  console.log("join room");
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not connected.");
    return;
  }
  
  const message: JoinRoomRequestMessage = {
    action: MessageType.JoinRoom,
    message: {
      roomUUID: room.roomUUID,
      name: room.name,
    },
    target: "server",
    sender: player.id,
  };
  socket.send(JSON.stringify(message)); 
}

function handleDeleteRoom(room: Room) {
  rooms.delete(room.roomUUID);
}

function handleRegisterResponse(resp: RegisterResponseMessage) {
  player.id = resp.message.id;
  player.name = nameInput.name;
  console.log(resp.message.rooms)
  resp.message.rooms
    .map((room) => ({
      roomUUID: room.roomUUID,
      name: room.name,
      count: room.count,
    }))
    .forEach(handleUpsertRoom)
}

function handleJoinRoomResponse(resp: JoinRoomResponseMessage) {
  roomUUID = resp.message.roomUUID;
  console.log(`roomUUID: ${roomUUID}`)
}

function createRoom() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not connected.");
    return;
  }
  
  const newRoomNameInput = document.getElementById("newRoomName") as HTMLInputElement;
  let roomName = newRoomNameInput.value;
  if (!roomName) {
    roomName = "Untitled Room"; 
  }

  const message: JoinRoomRequestMessage = {
    action: MessageType.JoinRoom,
    message: {
      name: roomName,
      roomUUID: null
    },
    target: "server",
    sender: player.id,
  };
  socket.send(JSON.stringify(message));
}

registerButton.onclick = register;
createRoomButton.onclick = createRoom;

createBoard();


