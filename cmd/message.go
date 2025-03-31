package main

import (
	"encoding/json"
	"log"
)

type MessageType string

const (
	SendMessage      MessageType = "SEND_MESSAGE"
	RoomUpdated      MessageType = "ROOM_UPDATED"
	JoinRoom         MessageType = "JOIN_ROOM"
	LeaveRoom        MessageType = "LEAVE_ROOM"
	StartGame        MessageType = "START_GAME"
	GameError        MessageType = "GAME_ERROR"
	GameState        MessageType = "GAME_STATE"
	MakeMove         MessageType = "MAKE_MOVE"
	GameResult       MessageType = "GAME_RESULT"
	RegisterResponse MessageType = "REGISTER_RESPONSE"
	JoinRoomResponse MessageType = "JOIN_ROOM_RESPONSE"
	LeaveRoomResponse MessageType = "LEAVE_ROOM_RESPONSE"
)

type Message struct {
	Action  MessageType `json:"action"`
	Message any         `json:"message"`
	Target  string      `json:"target"`
	Sender  *Client     `json:"sender"`
}

func (m *Message) encode() []byte {
	json, err := json.Marshal(m)
	if err != nil {
		log.Fatal(err)
	}

	return json
}

type RegisterResponsePayload struct {
	ID    string               `json:"id"`
	Rooms []RoomUpdatedPayload `json:"rooms"`
}

type ClientMessage struct {
	Action  MessageType `json:"action"`
	Message any         `json:"message"`
	Target  string      `json:"target"`
	Sender  *Client
}

type JoinRoomPayload struct {
	RoomUUID string `json:"roomUUID"`
	Name     string `json:"name"`
}

type LeaveRoomPayload struct {
	RoomUUID string `json:"roomUUID"`
}

type StartGamePayload struct {
	RoomUUID string `json:"roomUUID"`
}

type RoomUpdatedPayload struct {
	RoomUUID string `json:"roomUUID"`
	Action   string `json:"action"`
	Name     string `json:"name"`
	Count    int    `json:"count"`
}

type PlayerPayload struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Token         int     `json:"token"`
	Score         int     `json:"score"`
	PossibleMoves []Point `json:"possibleMoves"`
}

type GameStatePayload struct {
	P1            PlayerPayload `json:"p1"`
	P2            PlayerPayload `json:"p2"`
	Round         int           `json:"round"`
	Turn          int           `json:"turn"`
	CurrentPlayer string        `json:"currentPlayer"`
	Board         [][]int       `json:"board"`
}

type MakeMovePayload struct {
	RoomUUID string `json:"roomUUID"`
	Point    Point  `json:"point"`
}
