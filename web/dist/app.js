"use strict";
const nameInput = document.getElementById("name");
const registerButton = document.getElementById("register");
// const hubElement = document.getElementById("hub") as HTMLDivElement;
const roomsElement = document.getElementById("rooms");
const createRoomButton = document.getElementById("createRoom");
// const joinButton = document.getElementById("join") as HTMLButtonElement;
const boardElement = document.getElementById("board");
const startButton = document.getElementById("start");
const gameboardElement = document.getElementById("gameboard");
const serverUrl = "ws://localhost:8080/ws";
let socket;
let roomUUID;
const rooms = new Map();
const player = {
    id: "",
    name: "",
};
var MessageType;
(function (MessageType) {
    MessageType["SendMessage"] = "SEND_MESSAGE";
    MessageType["JoinRoom"] = "JOIN_ROOM";
    MessageType["LeaveRoom"] = "LEAVE_ROOM";
    MessageType["StartGame"] = "START_GAME";
    MessageType["MakeMove"] = "MAKE_MOVE";
})(MessageType || (MessageType = {}));
var ServerMessageType;
(function (ServerMessageType) {
    ServerMessageType["SendMessage"] = "SEND_MESSAGE";
    ServerMessageType["RoomUpdated"] = "ROOM_UPDATED";
    ServerMessageType["RegisterResponse"] = "REGISTER_RESPONSE";
    ServerMessageType["JoinRoomResponse"] = "JOIN_ROOM_RESPONSE";
    ServerMessageType["GameError"] = "GAME_ERROR";
    ServerMessageType["GameState"] = "GAME_STATE";
})(ServerMessageType || (ServerMessageType = {}));
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
    [ServerMessageType.GameError]: (msg) => handleGameError(msg),
    [ServerMessageType.GameState]: (msg) => handleGameState(msg),
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
function handleGameError(resp) {
    console.error(resp.message);
}
function handleGameState(resp) {
    // TODO: use another event handler for start game response
    startButton.disabled = true;
    renderEmptyBoard();
    gameboardElement.hidden = false;
    renderGameBoard(resp);
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
function handleStartGameRequest() {
    const message = {
        action: MessageType.StartGame,
        message: {
            roomUUID: roomUUID
        },
        sender: player.id
    };
    socket.send(JSON.stringify(message));
}
function renderGameBoard(resp) {
    const p1Name = document.getElementById("p1Name");
    p1Name.textContent = resp.message.p1.id; // TODO: need name from backend
    const p1Score = document.getElementById("p1Score");
    p1Score.textContent = resp.message.p1.score.toString();
    const p2Name = document.getElementById("p2Name");
    ;
    p2Name.textContent = resp.message.p2.id; // TODO: need name from backend
    const p2Score = document.getElementById("p2Score");
    p2Score.textContent = resp.message.p2.score.toString();
    const p1 = document.getElementById("p1");
    const p2 = document.getElementById("p2");
    if (resp.message.currentPlayer == resp.message.p1.id) {
        p1.style.backgroundColor = "lightyellow";
        p2.style.backgroundColor = "white";
    }
    else {
        p1.style.backgroundColor = "white";
        p2.style.backgroundColor = "lightyellow";
    }
    const round = document.getElementById("round");
    round.textContent = resp.message.round.toString();
    const turn = document.getElementById("turn");
    turn.textContent = resp.message.turn.toString();
    renderBoard(resp);
}
function renderEmptyBoard() {
    boardElement.innerHTML = "";
    boardElement.hidden = false;
    for (let row = 0; row < 8; row++) {
        const rowDiv = document.createElement("div");
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
function isCurrentPlayer(resp) {
    return resp.message.currentPlayer === player.id;
}
function getBoardCell(i, j) {
    return document.querySelector(`.board-cell[data-row="${i}"][data-col="${j}"]`);
}
function renderBoard(resp) {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const token = resp.message.board[i][j];
            if (token == 0) {
                continue;
            }
            const cell = getBoardCell(i, j);
            if (token == 1) {
                cell.style.backgroundColor = "Black";
            }
            else if (token == 2) {
                cell.style.backgroundColor = "White";
            }
            else {
                cell.style.backgroundColor = "Gainsboro";
            }
        }
    }
    if (!isCurrentPlayer(resp)) {
        return;
    }
    const possibleMoves = (resp.message.p1.id === player.id)
        ? resp.message.p1.possibleMoves
        : resp.message.p2.possibleMoves;
    possibleMoves
        .map((move) => getBoardCell(move.x, move.y))
        .forEach((cell) => {
        cell.style.backgroundColor = "LightCyan";
        cell.onclick = () => handleCellClick(Number(cell.dataset.row), Number(cell.dataset.col));
    });
}
function handleCellClick(row, col) {
    if (!socket) {
        return;
    }
    const msg = {
        action: MessageType.MakeMove,
        message: {
            roomUUID: roomUUID,
            point: {
                x: col,
                y: row,
            },
        },
        sender: player.id,
    };
    socket.send(JSON.stringify(msg));
}
registerButton.onclick = register;
createRoomButton.onclick = createRoom;
startButton.onclick = handleStartGameRequest;
