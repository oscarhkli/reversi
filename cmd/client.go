package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	// Name of the client
	name string

	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte

	// ID of the client
	ID uuid.UUID `json:"id"`

	// Rooms that client currently in
	rooms map[*Room]bool
}

func NewClient(conn *websocket.Conn, hub *Hub, name string) *Client {
	return &Client{
		name:  name,
		hub:   hub,
		conn:  conn,
		send:  make(chan []byte, 256),
		ID:    uuid.New(),
		rooms: make(map[*Room]bool),
	}
}

// readPump pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) readPump() {
	defer func() {
		c.disconnect()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))
		c.handleNewMessage(message)
	}
}

// writePump pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			// n := len(c.send)
			// for i := 0; i < n; i++ {
			// 	w.Write(newline)
			// 	w.Write(<-c.send)
			// }

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// disconnect unregisters both hub and rooms
func (c *Client) disconnect() {
	c.hub.unregister <- c
	for r := range c.rooms {
		r.unregister <- c
	}
	c.hub.unregister <- c
	c.conn.Close()
}

// handleNewMessage handles all client's action
func (c *Client) handleNewMessage(jsonMsg []byte) {
	var mDTO ClientMessageDTO
	log.Println(string(jsonMsg))
	err := json.Unmarshal(jsonMsg, &mDTO)
	if err != nil {
		log.Fatalf("error in unmarshalling JSON message %s", err)
	}

	client := c.hub.findClientByID(mDTO.Sender)
	msg := ClientMessage{
		Action: mDTO.Action,
		Target: mDTO.Target,
		Sender: client,
	}

	switch msg.Action {
	case SendMessage:
		room := c.hub.findRoomByUUID(mDTO.Target)
		if room != nil {
			serverMsg := Message{
				Action:  msg.Action,
				Message: "",
				Target:  msg.Target,
				Sender:  msg.Sender,
			}
			room.broadcast <- &serverMsg
		}
	case JoinRoom:
		c.handleJoinRoomMessage(mDTO.Message)
	case LeaveRoom:
		log.Println(mDTO)
		c.handleLeaveRoomMessage(mDTO.Message)
	case StartGame:
		c.handleStartGameMessage(mDTO.Message)
	case MakeMove:
		c.handleMove(mDTO.Message)
	}
}

// handleJoinRoomMessage finds room by room UUID and join if exist. Othewise, new room will be created
func (c *Client) handleJoinRoomMessage(payload json.RawMessage) {
	var jp JoinRoomPayload
	err := json.Unmarshal(payload, &jp)
	if err != nil {
		log.Fatalf("error in unmarshalling JSON message %s", err)
	}

	log.Println("handleJoinRoomMessage:", jp)

	r := c.hub.findRoomByUUID(jp.RoomUUID)
	if r == nil {
		r = c.hub.createRoom(jp.Name)
	}

	c.rooms[r] = true
	r.register <- c
}

// handleLeaveRoomMessage leave the room according to the room UUID
func (c *Client) handleLeaveRoomMessage(payload json.RawMessage) {
	log.Println("handleLeaveRoom")
	var lp LeaveRoomPayload
	err := json.Unmarshal(payload, &lp)
	if err != nil {
		log.Fatalf("error in unmarshalling JSON message %s", err)
	}

	log.Println("handleLeaveRoomMessage:", lp)

	r := c.hub.findRoomByUUID(lp.RoomUUID)

	_, ok := c.rooms[r]
	if ok {
		delete(c.rooms, r)
	}

	r.unregister <- c
}

func (c *Client) handleStartGameMessage(payload json.RawMessage) {
	var sp StartGamePayload
	err := json.Unmarshal(payload, &sp)
	if err != nil {
		log.Fatalf("error in unmarshalling JSON message %s", err)
	}

	r := c.hub.findRoomByUUID(sp.RoomUUID)

	_, ok := c.rooms[r]
	if !ok {
		m := Message{
			Action:  GameError,
			Message: "You are not in this room.",
		}
		c.send <- m.encode()
		return
	}
	if len(r.clients) < 2 {
		m := Message{
			Action:  GameError,
			Message: "2 people are required to start the game.",
		}
		c.send <- m.encode()
		return
	}

	r.startGame()
}

func (c *Client) handleMove(payload json.RawMessage) {
	log.Println("handleMove")
}

// serveWs handles websocket requests from the peer.
func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	var name string
	n, ok := r.URL.Query()["name"]
	if !ok || len(n[0]) == 0 {
		log.Println("URL Param name isn't provided. Use default name instead")
		name = "New Player"
	} else {
		name = n[0]
	}

	client := NewClient(conn, hub, name)
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}
