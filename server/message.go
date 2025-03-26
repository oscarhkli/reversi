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
	RegisterResponse MessageType = "REGISTER_RESPONSE"
	JoinRoomResponse MessageType = "JOIN_ROOM_RESPONSE"
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
	Action MessageType `json:"action"`
	Target string      `json:"target"`
	Sender *Client     `json:"sender"`
}

type ClientMessageDTO struct {
	Action  MessageType     `json:"action"`
	Message json.RawMessage `json:"message"`
	Target  string          `json:"target"`
	Sender  string          `json:"sender"`
}

type JoinRoomPayload struct {
	RoomUUID string `json:"roomUUID"`
	Name     string `json:"name"`
}

type LeaveRoomPayload struct {
	RoomUUID string `json:"roomUUID"`
}

type RoomUpdatedPayload struct {
	RoomUUID string `json:"roomUUID"`
	Action   string `json:"action"`
	Name     string `json:"name"`
	Count    int    `json:"count"`
}
