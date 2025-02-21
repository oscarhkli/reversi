package main

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	Width  = 8
	Height = 8
)

type Point struct {
	X int
	Y int
}

func (p Point) ToNotation() (Notation, error) {
	if p.X < 0 || p.X >= Width || p.Y < 0 || p.Y >= Height {
		return Notation(""), errors.New("invalid input")
	}
	return Notation(fmt.Sprintf("%c%d", 'a'+p.X, 1+p.Y)), nil
}

type Notation string

func (n Notation) ToPoint() (Point, error) {
	if len(n) != 2 || n[0] < 'a' || n[0] > 'h' || n[1] < '0' || n[1] > '8' {
		return Point{}, errors.New("invalid input")
	}
	x := int(n[0] - byte('a'))
	y := int(n[1] - byte('1'))
	return Point{x, y}, nil
}

type PlayerType int

const (
	Unknown PlayerType = iota
	Human
	Computer
)

type Player struct {
	id            int
	name          string
	score         int
	possibleMoves map[Point][]Point
	playerType    PlayerType
}

type PlayerCfg struct {
	name       string
	playerType PlayerType
}

type PlayerCfgFunc func(playerCfg *PlayerCfg)

func WithName(name string) PlayerCfgFunc {
	return func(playerCfg *PlayerCfg) {
		playerCfg.name = name
	}
}

func WithPlayerType(playerType PlayerType) PlayerCfgFunc {
	return func(playerCfg *PlayerCfg) {
		playerCfg.playerType = playerType
	}
}

func NewPlayer(id int, cfgFuncs ...PlayerCfgFunc) *Player {
	var config PlayerCfg
	for _, cfgFunc := range cfgFuncs {
		cfgFunc(&config)
	}

	playerType := Human
	if config.playerType != Unknown {
		playerType = config.playerType
	}

	var name string
	if len(config.name) > 0 {
		name = config.name
	} else {
		if playerType == Human {
			name = "P"
		} else {
			name = "C"
		}
		name += strconv.Itoa(id)
	}

	return &Player{
		id:            id,
		name:          name,
		score:         0,
		possibleMoves: make(map[Point][]Point),
		playerType:    playerType,
	}
}

func (p *Player) ChooseMove(g *GameBoard) (Point, error) {
	if len(p.possibleMoves) == 0 {
		return Point{}, errors.New("no possible moves")
	}

	switch p.playerType {
	case Human:
		return p.humanChooseMove()
	case Computer:
		return p.randomChooseMove()
	default:
		return Point{}, errors.New("unexpected error in ChooseMove")
	}
}

func (p *Player) randomChooseMove() (Point, error) {
		for point := range p.possibleMoves {
			return point, nil
		}
		return Point{}, errors.New(fmt.Sprintf("unexpected error: possibleMoves of %v is empty", p.name))
}

func (p *Player) humanChooseMove() (Point, error) {
	for i := 0; i < 3; i++ {
		var input Notation
		fmt.Printf("%v: Choose a cell for your disk (e.g., c2, h3):\n", p.name)
		fmt.Scanln(&input)

		if len(input) == 0 {
			return p.randomChooseMove()
		}

		point, err := input.ToPoint()
		if err != nil {
			fmt.Println(err.Error())
			continue
		}

		_, ok := p.possibleMoves[point]
		if !ok {
			fmt.Println("Invalid move, try again.")
		}

		return point, nil
	}

	fmt.Println("Too many trails! The game will randomly choose a cell.")
	return p.randomChooseMove()
}

type GameCfg struct {
	p1First  bool
	showHint bool
}

type GameCfgFunc func(*GameCfg)

func defaultGameConfig() GameCfg {
	return GameCfg{
		p1First:  true,
		showHint: true,
	}
}

func WithP1First(p1First bool) GameCfgFunc {
	return func(cfg *GameCfg) {
		cfg.p1First = p1First
	}
}

func WithShowHint(showHint bool) GameCfgFunc {
	return func(cfg *GameCfg) {
		cfg.showHint = showHint
	}
}

type GameBoard struct {
	cfg    GameCfg
	board  [][]int
	turn   int
	p1Turn bool
	p1     *Player
	p2     *Player
}

func NewGameBoard(p1, p2 Player, cfgFuncs ...GameCfgFunc) *GameBoard {
	cfg := defaultGameConfig()
	for _, cfgFunc := range cfgFuncs {
		cfgFunc(&cfg)
	}
	board := [][]int{
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 1, 2, 0, 0, 0},
		{0, 0, 0, 2, 1, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
	}

	g := GameBoard{
		cfg:   cfg,
		board: board,
		turn:  1,
		p1:    &p1,
		p2:    &p2,
	}
	g.p1.possibleMoves = g.PossibleMoves(1)
	g.p2.possibleMoves = g.PossibleMoves(2)
	return &g
}

func (g GameBoard) Print() {
	currPlayer := g.CurrentPlayer()

	var sb strings.Builder
	line := "+-+-+-+-+-+-+-+-+-+\n"

	sb.WriteString(line)
	sb.WriteString("| |a|b|c|d|e|f|g|h|\n")
	sb.WriteString(line)
	for i, row := range g.board {
		sb.WriteString(fmt.Sprintf("|%d|", i+1))
		for j, cell := range row {
			if cell == 1 {
				sb.WriteString("●")
			} else if cell == 2 {
				sb.WriteString("○")
			} else {
				if g.cfg.showHint {
					point := Point{j, i}
					_, ok := currPlayer.possibleMoves[point]
					if ok {
						sb.WriteString("?")
					} else {
						sb.WriteString(" ")
					}
				} else {
					sb.WriteString(" ")
				}
			}
			sb.WriteString("|")
		}
		sb.WriteString("\n")
		sb.WriteString(line)
	}
	sb.WriteString(fmt.Sprintf("Turn %2d | %s: %2d | %s: %2d\n", g.turn, g.p1.name, g.p1.score, g.p2.name, g.p2.score))

	fmt.Print(sb.String())
}

func (g GameBoard) PossibleMoves(player int) map[Point][]Point {
	pMoves := make(map[Point][]Point)

	// If player is 1, oppo is 2; if player is 2; oppo is 1
	oppo := 3 - player

	// Directions - up/down, left/right, diagonals
	dirs := [8][2]int{
		{-1, 0}, {1, 0}, {0, -1}, {0, 1},
		{-1, -1}, {-1, 1}, {1, -1}, {1, 1},
	}

	for y, row := range g.board {
		for x, cell := range row {
			if cell != oppo {
				continue
			}

			for _, dir := range dirs {
				dy, dx := dir[0], dir[1]
				ty, tx := y+dy, x+dx

				if tx == -1 || tx == Width || ty == -1 || ty == Height || g.board[ty][tx] != 0 {
					continue
				}

				flips := []Point{}
				for nx, ny := x, y; nx >= 0 && nx < Width && ny >= 0 && ny < Height; nx, ny = nx-dx, ny-dy {
					if g.board[ny][nx] == 0 {
						break
					}
					if g.board[ny][nx] == player {
						p := Point{tx, ty}
						_, ok := pMoves[p]
						if !ok {
							pMoves[p] = flips
						} else {
							pMoves[p] = append(pMoves[p], flips...)
						}
						break
					}
					flips = append(flips, Point{nx, ny})
				}
			}
		}
	}
	return pMoves
}

func (g GameBoard) EndGame() bool {
	return len(g.p1.possibleMoves)+len(g.p2.possibleMoves) == 0
}

func (g *GameBoard) Mark(point Point, player Player) (int, error) {
	v, ok := player.possibleMoves[point]
	if !ok {
		return 0, errors.New("invalid move")
	}
	g.board[point.Y][point.X] = player.id
	for _, p := range v {
		g.board[p.Y][p.X] = player.id
	}
	return len(v) + 1, nil
}

func (g *GameBoard) RefreshState() {
	g.p1.possibleMoves, g.p2.possibleMoves = g.PossibleMoves(1), g.PossibleMoves(2)

	scores := make([]int, 3)
	for _, row := range g.board {
		for _, cell := range row {
			scores[cell]++
		}
	}
	g.p1.score, g.p2.score = scores[1], scores[2]
	g.turn++
}

func (g GameBoard) CurrentPlayer() *Player {
	if g.cfg.p1First && g.turn%2 == 1 {
		return g.p1
	}
	return g.p2
}

func createPlayer(id int) *Player {
	fmt.Printf("Settings for Player %d\n", id)
	fmt.Printf("Name (empty for default name): ")
	var name string
	fmt.Scanln(&name)

	fmt.Printf("Is Player %d a human (y/n/others = human): ", id)
	var isHuman string
	fmt.Scanln(&isHuman)

	playerType := Human
	if isHuman == "n" {
		playerType = Computer
	}
	return NewPlayer(id, WithName(name), WithPlayerType(playerType))
}

func main() {
	p1, p2 := createPlayer(1), createPlayer(2)
	g := NewGameBoard(*p1, *p2, WithP1First(true), WithShowHint(true))

	for !g.EndGame() {
		g.Print()
		currPlayer := g.CurrentPlayer()
		if len(currPlayer.possibleMoves) == 0 {
			fmt.Printf("%v has no possibleMoves and is skipped.\n", currPlayer.name)
			g.RefreshState()
			continue
		}

		point, err := currPlayer.ChooseMove(g)
		if err != nil {
			fmt.Println(err.Error())
			continue
		}

		flips, err := g.Mark(point, *currPlayer)
		if err != nil {
			fmt.Println(err.Error())
			os.Exit(1)
		}

		notation, err := point.ToNotation()
		if err != nil {
			fmt.Println(err.Error())
			os.Exit(1)
		}

		fmt.Printf("%v chooses %v and flips %v disks\n", currPlayer.name, notation, flips)
		g.RefreshState()
	}

	g.Print()
	fmt.Println("End")
}
