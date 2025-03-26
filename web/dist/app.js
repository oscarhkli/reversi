"use strict";
const nameInput = document.getElementById("name");
const registerButton = document.getElementById("register");
// const hubElement = document.getElementById("hub") as HTMLDivElement;
const roomsElement = document.getElementById("rooms");
const createRoomButton = document.getElementById("createRoom");
// const joinButton = document.getElementById("join") as HTMLButtonElement;
const boardElement = document.getElementById("board");
const serverUrl = "ws://localhost:8080/ws";
let socket;
let currentGameState;
let roomUUID;
const rooms = new Map();
const player = {
    id: "",
    name: "",
    score: 0,
    possibleMoves: [],
};
function createBoard() {
    boardElement.innerHTML = "";
    for (let row = 0; row < 8; row++) {
        const rowDiv = document.createElement("div");
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
var MessageType;
(function (MessageType) {
    MessageType["SendMessage"] = "SEND_MESSAGE";
    MessageType["JoinRoom"] = "JOIN_ROOM";
    MessageType["LeaveRoom"] = "LEAVE_ROOM";
    MessageType["MakeMove"] = "MAKE_MOVE";
})(MessageType || (MessageType = {}));
var ServerMessageType;
(function (ServerMessageType) {
    ServerMessageType["SendMessage"] = "SEND_MESSAGE";
    ServerMessageType["RoomUpdated"] = "ROOM_UPDATED";
    ServerMessageType["RegisterResponse"] = "REGISTER_RESPONSE";
    ServerMessageType["JoinRoomResponse"] = "JOIN_ROOM_RESPONSE";
})(ServerMessageType || (ServerMessageType = {}));
function handleCellClick(row, col) {
    if (currentGameState.board[row][col] == 0 && socket) {
        const msg = {
            action: MessageType.MakeMove,
            message: {
                row: row,
                col: col,
            },
            target: "server",
            sender: player.id,
        };
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
                const resp = JSON.parse(event.data);
                const handler = serverMessageHandler[resp.action];
                if (!handler) {
                    console.error("Unknown message", event.data);
                    return;
                }
                handler(resp);
            }
            catch (e) {
                console.error("Exception caught when handling event:", event.data, e);
            }
        };
        socket.onclose = () => console.log("Socket closed");
        socket.onerror = (error) => console.error("WebSocket error:", error);
    }
}
const serverMessageHandler = {
    [ServerMessageType.SendMessage]: (msg) => handleServerGeneralMessage(msg),
    [ServerMessageType.RoomUpdated]: (msg) => handleRoomUpdatedMessage(msg),
    [ServerMessageType.RegisterResponse]: (msg) => handleRegisterResponse(msg),
    [ServerMessageType.JoinRoomResponse]: (msg) => handleJoinRoomResponse(msg),
};
function handleServerGeneralMessage(resp) {
    console.log(resp);
}
function handleRoomUpdatedMessage(resp) {
    const room = {
        roomUUID: resp.message.roomUUID,
        name: resp.message.name,
        count: resp.message.count
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
function handleUpsertRoom(room) {
    rooms.set(room.roomUUID, room);
    roomsElement.replaceChildren();
    roomsElement.innerHTML = "";
    for (const room of rooms.values()) {
        const roomElement = document.createElement("div");
        roomElement.className = "room";
        roomElement.style.border = '1px solid #ccc';
        roomElement.style.padding = '10px';
        roomElement.style.margin = '5px';
        roomElement.style.width = "100px";
        roomElement.style.height = "50px";
        roomElement.style.cursor = "pointer";
        const label = document.createElement("p");
        label.textContent = `${room.name}: ${room.count}/2`;
        roomElement.appendChild(label);
        if (room.count == 2) {
            roomElement.style.opacity = "0.5";
            roomElement.style.pointerEvents = "none";
        }
        else {
            roomElement.onclick = () => handleRoomClick(room);
        }
        roomsElement.appendChild(roomElement);
    }
}
function handleRoomClick(room) {
    console.log("join room");
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected.");
        return;
    }
    const message = {
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
function handleDeleteRoom(room) {
    rooms.delete(room.roomUUID);
}
function handleRegisterResponse(resp) {
    player.id = resp.message.id;
    player.name = nameInput.name;
    console.log(resp.message.rooms);
    resp.message.rooms
        .map((room) => ({
        roomUUID: room.roomUUID,
        name: room.name,
        count: room.count,
    }))
        .forEach(handleUpsertRoom);
}
function handleJoinRoomResponse(resp) {
    roomUUID = resp.message.roomUUID;
    console.log(`roomUUID: ${roomUUID}`);
}
function createRoom() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected.");
        return;
    }
    const newRoomNameInput = document.getElementById("newRoomName");
    let roomName = newRoomNameInput.value;
    if (!roomName) {
        roomName = "Untitled Room";
    }
    const message = {
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
