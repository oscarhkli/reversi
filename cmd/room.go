package main

import (
	"fmt"
	"log"

	"github.com/google/uuid"
)

type Room struct {
	name    string
	uuid    string
	clients map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan *Message
	gameBoard  *GameBoard
	round      int
}

func NewRoom(name string) *Room {
	return &Room{
		name:    name,
		uuid:    uuid.NewString(),
		clients: make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *Message),
		round:      0,
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
		if r.gameBoard != nil {
			r.handleSurrender(client)
			r.gameBoard = nil
		}
		delete(r.clients, client)
		client.hub.broadcastRoomUpdated(r, "UPDATED")
		r.notifyClientLeaveRoomResult(client)
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

func (r *Room) notifyClientLeaveRoomResult(client *Client) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered in notifyClientLeaveRoomResult: %v", r)
		}
	}()
	message := Message{
		Action: LeaveRoomResponse,
		Message: LeaveRoomPayload{
			RoomUUID: r.uuid,
		},
	}

	select {
	case client.send <- message.encode():
	default:
		log.Printf("client %v send closed", client.ID)
	}
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

func (r *Room) handleSurrender(client *Client) {
	if r.gameBoard == nil {
		return
	}

	if (r.gameBoard.p1.id == client.ID) {
		r.gameBoard.p1.surrender = true
	} else {
		r.gameBoard.p2.surrender = true
	}
	r.announceWinner();
}

func (r *Room) startGame() {
	log.Println("startGame")
	r.round++
	var p1, p2 *Player
	for c := range r.clients {
		if p1 == nil {
			p1 = NewPlayer(1, WithID(c.ID), WithName(c.name))
			continue
		}
		if p2 == nil {
			p2 = NewPlayer(2, WithID(c.ID), WithName(c.name))
		}
	}

	if p1 == nil || p2 == nil {
		log.Println("player is missing")
		return
	}
	log.Println(p1, p2)
	r.gameBoard = NewGameBoard(*p1, *p2, WithP1First(r.round%2 == 1), WithShowHint(true))
	m := &Message{
		Action:  SendMessage,
		Message: "Game Start!",
		Target:  r.uuid,
	}
	r.broadcastToClientsInRoom(m)
	r.broadcastGameState()
}

// broadcastGameState. To broadcast the game state to all clients in the room for render the board data
func (r *Room) broadcastGameState() {
	getPossibleMoves := func(m map[Point][]Point) []Point {
		var res []Point
		for p := range m {
			res = append(res, p)
		}
		return res
	}

	constructPlayerPayload := func(p *Player) PlayerPayload {
		return PlayerPayload{
			ID:            p.id.String(),
			Name:          p.name,
			Token:         p.token,
			Score:         p.score,
			PossibleMoves: getPossibleMoves(p.possibleMoves),
		}
	}
	log.Println(r.gameBoard.CurrentPlayer().id)
	m := &Message{
		Action: GameState,
		Message: GameStatePayload{
			P1:            constructPlayerPayload(r.gameBoard.p1),
			P2:            constructPlayerPayload(r.gameBoard.p2),
			Round:         r.round,
			Turn:          r.gameBoard.turn,
			CurrentPlayer: r.gameBoard.CurrentPlayer().id.String(),
			Board:         r.gameBoard.board,
		},
		Target: r.uuid,
	}

	r.broadcastToClientsInRoom(m)
}

func (r *Room) handleMove(c *Client, p Point) {
	if r.gameBoard.CurrentPlayer().id != c.ID {
		log.Println("wrong sequence")
		return
	}

	flips, err := r.gameBoard.Mark(p, *r.gameBoard.CurrentPlayer())
	if err != nil {
		log.Println("invalid move")
		m := &Message{
			Action:  SendMessage,
			Message: fmt.Sprintf("Invalid move for %v. Try again.", c.name),
			Target:  r.uuid,
		}
		r.broadcastToClientsInRoom(m)
		return
	}

	m := &Message{
		Action:  SendMessage,
		Message: fmt.Sprintf("%v flips %v disks", c.name, flips),
		Target:  r.uuid,
	}
	r.broadcastToClientsInRoom(m)
	r.gameBoard.RefreshState()
	r.broadcastGameState()

	if r.gameBoard.EndGame() {
		r.announceWinner()
		return
	}

	if len(r.gameBoard.CurrentPlayer().possibleMoves) == 0 {
		m = &Message{
			Action:  SendMessage,
			Message: fmt.Sprintf("%v has no possibleMoves and is skipped.", r.gameBoard.CurrentPlayer().name),
			Target:  r.uuid,
		}
		r.broadcastToClientsInRoom(m)
		r.broadcastGameState()
	}

}

// announceWinner. To deduce winner and broadcast to the clients in the room
func (r *Room) announceWinner() {
	winner := r.gameBoard.Result()

	m := &Message{
		Action: GameResult,
		Target: r.uuid,
	}
	if winner != nil {
		m.Message = winner.id.String()
	}
	r.broadcastToClientsInRoom(m)	
}
