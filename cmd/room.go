package main

import (
	"fmt"
	"github.com/google/uuid"
)

type Room struct {
	name       string
	uuid       string
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan *Message
}

func NewRoom(name string) *Room {
	return &Room{
		name:       name,
		uuid:       uuid.NewString(),
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *Message),
	}
}

func (r *Room) Run() {
	for {
		select {
		case client := <-r.register:
			r.registerClientInRoom(client)
		case client := <-r.unregister:
			r.unregisterClientInRoom(client)
		case message := <-r.broadcast:
			r.broadcastToClientsInRoom(message)
		}
	}
}

func (r *Room) registerClientInRoom(client *Client) {
	r.clients[client] = true
	client.hub.broadcastRoomUpdated(r, "UPDATED")
	r.notifyClientJoinRoomResult(client)
	r.notifyClientJoined(client)
}

func (r *Room) unregisterClientInRoom(client *Client) {
	if _, ok := r.clients[client]; ok {
		delete(r.clients, client)
		r.notifyClientLeft(client)
	}
}

func (r *Room) broadcastToClientsInRoom(m *Message) {
	for client := range r.clients {
		client.send <- m.encode()
	}
}

func (r *Room) notifyClientJoinRoomResult(client *Client) {
	message := Message{
		Action: JoinRoomResponse,
		Message: JoinRoomPayload{
			RoomUUID: r.uuid,
			Name:     r.name,
		},
	}
	client.send <- message.encode()
}

// notifyClientJoined broadcasts message to the room about new client joined
func (r *Room) notifyClientJoined(client *Client) {
	message := &Message{
		Action:  SendMessage,
		Target:  r.uuid,
		Message: fmt.Sprintf("%s join the room", client.name),
	}

	r.broadcastToClientsInRoom(message)
}

// notifyClientLeft broadcasts message to the room about a client left
func (r *Room) notifyClientLeft(client *Client) {
	message := &Message{
		Action:  SendMessage,
		Target:  r.uuid,
		Message: fmt.Sprintf("%s left the room", client.name),
	}

	r.broadcastToClientsInRoom(message)
}
