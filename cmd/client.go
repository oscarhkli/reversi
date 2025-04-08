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
	room *Room
}

func NewClient(conn *websocket.Conn, hub *Hub, name string) *Client {
	return &Client{
		name:  name,
		hub:   hub,
		conn:  conn,
		send:  make(chan []byte, 256),
		ID:    uuid.New(),
		room: nil,
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
		c.conn.Close()
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

// disconnect unregisters both hub and room
func (c *Client) disconnect() {
	if c.room != nil {
		c.room.unregister <- c
	}
	c.hub.unregister <- c
}

// unmarshalClientMessagePayload. Unmarshal msg.Message into the correct struct type
func unmarshalClientMessagePayload[T any](message any) (T, error) {
	var payload T
	if payloadMap, ok := message.(map[string]any); ok {
		// Convert map to JSON and unmarshal into T
		jsonData, _ := json.Marshal(payloadMap)
		err := json.Unmarshal(jsonData, &payload)
		return payload, err
	}
	return payload, json.Unmarshal(nil, &payload)
}

// handleNewMessage handles all client's action
func (c *Client) handleNewMessage(jsonMsg []byte) {
	var msg ClientMessage
	log.Println(string(jsonMsg))
	err := json.Unmarshal(jsonMsg, &msg)
	if err != nil {
		log.Fatalf("error in unmarshalling JSON message %s", err)
	}

	msg.Sender = c

	switch msg.Action {
	case SendMessage:
		r := c.room

		if r != nil {
			serverMsg := Message{
				Action:  msg.Action,
				Message: "",
				Target:  msg.Target,
				Sender:  msg.Sender,
			}
			r.broadcast <- &serverMsg
		}
	case JoinRoom:
		if payload, err := unmarshalClientMessagePayload[JoinRoomPayload](msg.Message); err == nil {
			c.handleJoinRoomMessage(payload)
		} else {
			log.Println("Invalid message format for JoinRoom")
		}
	case LeaveRoom:
		if payload, err := unmarshalClientMessagePayload[LeaveRoomPayload](msg.Message); err == nil {
			c.handleLeaveRoomMessage(payload)
		} else {
			log.Println("Invalid message format for LeaveRoom")
		}
	case StartGame:
		if payload, err := unmarshalClientMessagePayload[StartGamePayload](msg.Message); err == nil {
			c.handleStartGameMessage(payload)
		} else {
			log.Println("Invalid message format for StartGame")
		}
	case MakeMove:
		if payload, err := unmarshalClientMessagePayload[MakeMovePayload](msg.Message); err == nil {
			c.handleMakeMove(payload)
		} else {
			log.Println("Invalid message format for MakeMove")
		}
	}
}

// handleJoinRoomMessage finds room by room UUID and join if exist. Othewise, new room will be created
func (c *Client) handleJoinRoomMessage(jp JoinRoomPayload) {
	r := c.hub.findRoomByUUID(jp.RoomUUID)
	if r == nil {
		r = c.hub.createRoom(jp.Name)
	}

	c.room = r
	r.register <- c
}

// handleLeaveRoomMessage leave the room according to the room UUID
func (c *Client) handleLeaveRoomMessage(lp LeaveRoomPayload) {
	r := c.room
	if r.uuid != lp.RoomUUID {
		m := Message{
			Action:  GameError,
			Message: "You are not in this room.",
		}
		c.send <- m.encode()
		return	
	}

	c.room = nil

	r.unregister <- c
}

func (c *Client) handleStartGameMessage(sp StartGamePayload) {
	r := c.room
	if r.uuid != sp.RoomUUID {
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

func (c *Client) handleMakeMove(mp MakeMovePayload) {
	r:= c.room
	if r.uuid != mp.RoomUUID {
		m := Message{
			Action:  GameError,
			Message: "You are not in this room.",
		}
		c.send <- m.encode()
		return	
	}

	r.handleMove(c, mp.Point)
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
