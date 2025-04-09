export interface Player {
  id: string;
  name: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Room {
  roomUUID: string;
  name: string;
  count: number;
}

export enum ClientMessageType {
  SendMessage = "SEND_MESSAGE",
  JoinRoom = "JOIN_ROOM",
  LeaveRoom = "LEAVE_ROOM",
  StartGame = "START_GAME",
  MakeMove = "MAKE_MOVE",
}

export type ClientMessage =
  | JoinRoomRequestMessage
  | LeaveRoomRequestMessage
  | StartGameMessage
  | MakeMoveMessage;

export enum ServerMessageType {
  SendMessage = "SEND_MESSAGE",
  RoomUpdated = "ROOM_UPDATED",
  RegisterResponse = "REGISTER_RESPONSE",
  JoinRoomResponse = "JOIN_ROOM_RESPONSE",
  LeaveRoomResponse = "LEAVE_ROOM_RESPONSE",
  GameError = "GAME_ERROR",
  GameState = "GAME_STATE",
  GameResult = "GAME_RESULT",
}

export type ServerMessage =
  | Message
  | RoomUpdatedMessage
  | RegisterResponseMessage
  | JoinRoomResponseMessage
  | LeaveRoomResponseMessage
  | GameErrorMessage
  | GameStateMessage;

export interface Message {
  action: ServerMessageType.SendMessage;
  message: string;
  target: string;
}

export interface RoomUpdatedMessage {
  action: ServerMessageType.RoomUpdated;
  message: {
    roomUUID: string;
    action: "ADDED" | "UPDATED" | "DELETED";
    name: string;
    count: number;
  };
  target: string;
}

export interface RegisterResponseMessage {
  action: ServerMessageType.RegisterResponse;
  message: {
    id: string;
    name: string;
    rooms: Room[];
  };
}

export interface JoinRoomRequestMessage {
  action: ClientMessageType.JoinRoom;
  message: {
    roomUUID: string | null;
    name: string;
  };
}

export interface LeaveRoomRequestMessage {
  action: ClientMessageType.LeaveRoom;
  message: {
    roomUUID: string;
  };
}

export interface StartGameMessage {
  action: ClientMessageType.StartGame;
  message: {
    roomUUID: string;
  };
}

export interface GameErrorMessage {
  action: ServerMessageType.GameError;
  message: string;
}

export interface GameStatePlayer {
  id: string;
  name: string;
  token: number;
  score: number;
  possibleMoves: Point[];
}

export interface GameStateMessage {
  action: ServerMessageType.GameState;
  message: {
    p1: GameStatePlayer;
    p2: GameStatePlayer;
    round: number;
    turn: number;
    currentPlayer: string; // player id
    board: number[][];
  };
}

export interface JoinRoomResponseMessage {
  action: ServerMessageType.JoinRoomResponse;
  message: {
    success: boolean;
    roomUUID: string;
    name: string;
  };
  target: string;
}

export interface LeaveRoomResponseMessage {
  action: ServerMessageType.LeaveRoomResponse;
  message: {
    success: boolean;
    roomUUID: string;
  };
  target: string;
}

export interface MakeMoveMessage {
  action: ClientMessageType.MakeMove;
  message: {
    roomUUID: string;
    point: Point;
  };
}
