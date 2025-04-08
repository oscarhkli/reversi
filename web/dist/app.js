"use strict";
const nameInput = document.getElementById("name");
const registerButton = document.getElementById("register");
const hubElement = document.getElementById("hub");
const createRoomButton = document.getElementById("createRoom");
const boardElement = document.getElementById("board");
const startButton = document.getElementById("start");
const leaveRoomButton = document.getElementById("leaveRoom");
const roomElement = document.getElementById("room");
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
    ServerMessageType["LeaveRoomResponse"] = "LEAVE_ROOM_RESPONSE";
    ServerMessageType["GameError"] = "GAME_ERROR";
    ServerMessageType["GameState"] = "GAME_STATE";
    ServerMessageType["GameResult"] = "GAME_RESULT";
})(ServerMessageType || (ServerMessageType = {}));
function register() {
    const name = nameInput.value;
    if (!name) {
        return;
    }
    nameInput.disabled = true;
    registerButton.disabled = true;
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
const serverMessageHandler = {
    [ServerMessageType.SendMessage]: (msg) => handleServerGeneralMessage(msg),
    [ServerMessageType.RoomUpdated]: (msg) => handleRoomUpdatedMessage(msg),
    [ServerMessageType.RegisterResponse]: (msg) => handleRegisterResponse(msg),
    [ServerMessageType.JoinRoomResponse]: (msg) => handleJoinRoomResponse(msg),
    [ServerMessageType.LeaveRoomResponse]: (msg) => handleLeaveRoomResponse(msg),
    [ServerMessageType.GameError]: (msg) => handleGameError(msg),
    [ServerMessageType.GameState]: (msg) => handleGameState(msg),
    [ServerMessageType.GameResult]: (msg) => handleGameResult(msg),
};
function appendMessageLogs(msg) {
    const messageLogs = document.getElementById("messageLogs");
    messageLogs.scrollTop = messageLogs.scrollHeight;
    if (messageLogs.textContent) {
        messageLogs.textContent += "\n";
    }
    messageLogs.textContent += msg;
}
function handleServerGeneralMessage(resp) {
    appendMessageLogs(resp.message);
}
function updateRoomControl(room) {
    if (roomUUID !== room.roomUUID) {
        return;
    }
    const currentRoomCountLabel = document.getElementById("currentRoomCount");
    currentRoomCountLabel.textContent = room.count.toString();
    startButton.disabled = room.count != 2;
}
function handleRoomUpdatedMessage(resp) {
    const room = {
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
function handleUpsertRoom(room) {
    rooms.set(room.roomUUID, room);
    const roomsElement = document.getElementById("rooms");
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
        }
        else {
            roomSelectElement.onclick = () => handleRoomClick(room);
        }
        roomsElement.appendChild(roomSelectElement);
    }
}
function handleRoomClick(room) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected.");
        return;
    }
    if (roomUUID) {
        console.error("Player is in a room. Cannot join another");
        return;
    }
    const message = {
        action: MessageType.JoinRoom,
        message: {
            roomUUID: room.roomUUID,
            name: room.name,
        },
    };
    socket.send(JSON.stringify(message));
}
function handleDeleteRoom(room) {
    rooms.delete(room.roomUUID);
}
function handleRegisterResponse(resp) {
    player.id = resp.message.id;
    player.name = resp.message.name;
    const greetingNameLabel = document.getElementById("greetingName");
    greetingNameLabel.textContent = player.name;
    const registrationElement = document.getElementById("registration");
    registrationElement.hidden = true;
    const mainElement = document.getElementById("main");
    mainElement.hidden = false;
    resp.message.rooms
        .map((room) => ({
        roomUUID: room.roomUUID,
        name: room.name,
        count: room.count,
    }))
        .forEach(handleUpsertRoom);
}
function handleJoinRoomResponse(resp) {
    const roomNameLabel = document.getElementById("roomName");
    roomNameLabel.textContent = resp.message.name;
    hubElement.hidden = true;
    roomUUID = resp.message.roomUUID;
    renderEmptyBoard();
    roomElement.hidden = false;
}
function handleLeaveRoomResponse(resp) {
    if (roomUUID == resp.message.roomUUID) {
        roomUUID = null;
        roomElement.hidden = true;
        hubElement.hidden = false;
    }
    else {
        console.error("unrelated message", resp);
    }
}
function handleGameError(resp) {
    console.error(resp.message);
}
function handleGameState(resp) {
    // TODO: use another event handler for start game response
    startButton.disabled = true;
    renderGameBoard(resp);
}
function handleGameResult(resp) {
    if (!resp.message) {
        // Draw
        appendMessageLogs("Draw game!");
    }
    else if (resp.message == player.id) {
        appendMessageLogs("You win!");
    }
    else {
        appendMessageLogs("You lose!");
    }
    startButton.disabled = false;
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
    createRoomButton.disabled = true;
    const message = {
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
    const message = {
        action: MessageType.StartGame,
        message: {
            roomUUID: roomUUID,
        },
    };
    socket.send(JSON.stringify(message));
}
function renderGameBoard(resp) {
    const p1Name = document.getElementById("p1Name");
    p1Name.textContent = resp.message.p1.name;
    const p1Score = document.getElementById("p1Score");
    p1Score.textContent = resp.message.p1.score.toString();
    const p2Name = document.getElementById("p2Name");
    p2Name.textContent = resp.message.p2.name;
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
function isCurrentPlayer(resp) {
    console.log(resp.message.currentPlayer, player.id);
    console.log(resp.message.currentPlayer === player.id);
    return resp.message.currentPlayer === player.id;
}
function getBoardCell(i, j) {
    return document.querySelector(`.board-cell[data-row="${i}"][data-col="${j}"]`);
}
function renderBoard(resp) {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const token = resp.message.board[i][j];
            const cell = getBoardCell(i, j);
            cell.disabled = true;
            if (token == 1) {
                cell.style.backgroundColor = "Black";
            }
            else if (token == 2) {
                cell.style.backgroundColor = "White";
            }
            else {
                cell.style.backgroundColor = "DarkGreen";
            }
        }
    }
    if (!isCurrentPlayer(resp)) {
        return;
    }
    const possibleMoves = resp.message.p1.id === player.id
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
        cell.onclick = () => handleCellClick(Number(cell.dataset.row), Number(cell.dataset.col));
    });
}
function handleCellClick(row, col) {
    if (!socket) {
        console.error("No socket connection established");
        return;
    }
    if (!roomUUID) {
        console.error("Player isn't in any room");
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
    };
    socket.send(JSON.stringify(msg));
}
function handleLeaveRoomClick() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected.");
        return;
    }
    if (!roomUUID) {
        console.error("Player isn't in any room");
        return;
    }
    const message = {
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
