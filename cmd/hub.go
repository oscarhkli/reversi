package main

import (
	"log"
)

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
	rooms      map[*Room]bool
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		rooms:      make(map[*Room]bool),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)
		case client := <-h.unregister:
			h.unregisterClient(client)
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.clients[client] = true
	log.Printf("new client joined: %s", client.ID)

	rooms := []RoomUpdatedPayload{}
	for room := range h.rooms {
		rooms = append(rooms, RoomUpdatedPayload{
			RoomUUID: room.uuid,
			Name:     room.name,
			Count:    len(room.clients),
		})
	}

	m := Message{
		Action: RegisterResponse,
		Message: RegisterResponsePayload{
			ID:    client.ID.String(),
			Name:  client.name,
			Rooms: rooms,
		},
	}
	client.conn.WriteMessage(1, m.encode())
}

func (h *Hub) unregisterClient(client *Client) {
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.send)
		log.Printf("client left: %s", client.ID)
	}
}

func (h *Hub) findRoomByUUID(uuid string) *Room {
	if len(uuid) == 0 {
		return nil
	}
	for r := range h.rooms {
		if r.uuid == uuid {
			return r
		}
	}
	return nil
}

func (h *Hub) findClientByID(id string) *Client {
	for c := range h.clients {
		if c.ID.String() == id {
			return c
		}
	}
	return nil
}

func (h *Hub) createRoom(name string) *Room {
	r := NewRoom(name)
	go r.Run()
	h.rooms[r] = true

	return r
}

func (h *Hub) broadcastRoomUpdated(r *Room, action string) {
	m := Message{
		Action: RoomUpdated,
		Message: RoomUpdatedPayload{
			RoomUUID: r.uuid,
			Action:   action,
			Name:     r.name,
			Count:    len(r.clients),
		},
	}
	h.broadcast <- m.encode()
}
