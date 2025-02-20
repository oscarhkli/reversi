package main

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

type Point struct {
	X int
	Y int
}

type GameConfig struct {
	width, height int
	p1First       bool
	showHint      bool
}

type Player struct {
	id            int
	name          string
	score         int
	possibleMoves map[Point][]Point
	manual        bool
}

func (p *Player) ToAuto() {
	p.manual = false
	p.name = strings.Replace(p.name, "P", "C", 1)
}

func NewPlayer(id int) *Player {
	name := "P" + strconv.Itoa(id)
	return &Player{
		id:            id,
		name:          name,
		score:         0,
		possibleMoves: make(map[Point][]Point),
		manual:        true,
	}
}

type GameBoard struct {
	cfg    GameConfig
	board  [][]int
	turn   int
	p1Turn bool
	p1     *Player
	p2     *Player
}

func NewConfig() GameConfig {
	return GameConfig{
		width:    8,
		height:   8,
		p1First:  true,
		showHint: true,
	}
}

func NewGameBoard(cfg GameConfig) *GameBoard {
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
		cfg:    cfg,
		board:  board,
		turn:   1,
		p1Turn: cfg.p1First,
		p1:     NewPlayer(1),
		p2:     NewPlayer(2),
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
	sb.WriteString(fmt.Sprintf("Turn %2d | P1: %2d | P2: %2d\n", g.turn, g.p1.score, g.p2.score))

	fmt.Print(sb.String())
}

func (g GameBoard) PossibleMoves(player int) map[Point][]Point {
	width, height := g.cfg.width, g.cfg.height

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

				if tx == -1 || tx == width || ty == -1 || ty == height || g.board[ty][tx] != 0 {
					continue
				}

				flips := []Point{}
				for nx, ny := x, y; nx >= 0 && nx < width && ny >= 0 && ny < height; nx, ny = nx-dx, ny-dy {
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

func notationToPoint(notation string) (Point, error) {
	if len(notation) != 2 || notation[0] < 'a' || notation[0] > 'h' || notation[1] < '0' || notation[1] > '8' {
		return Point{}, errors.New("invalid input")
	}
	x := int(notation[0] - byte('a'))
	y := int(notation[1] - byte('1'))
	return Point{x, y}, nil
}

func main() {
	g := NewGameBoard(NewConfig())

	for !g.EndGame() {
		g.Print()
		currPlayer := g.CurrentPlayer()
		if len(currPlayer.possibleMoves) == 0 {
			fmt.Printf("%v has no possibleMoves and is skipped\n", currPlayer.name)
			g.RefreshState()
			continue
		}

		if currPlayer.manual {
			for {
				var input string
				fmt.Printf("%v: Choose a cell for your disk (e.g., c2, h3):\n", currPlayer.name)
				fmt.Scanln(&input)

				// For testing use
				if input == "auto" {
					oldName := currPlayer.name
					currPlayer.ToAuto()
					fmt.Printf("%v is now controlled by CPU and renamed to %v\n", oldName, currPlayer.name)
					break
				}
				p, err := notationToPoint(input)
				if err != nil {
					fmt.Println(err.Error())
					continue
				}

				flips, err := g.Mark(p, *currPlayer)
				if err != nil {
					fmt.Println(err.Error())
					continue
				}

				g.RefreshState()
				fmt.Printf("%v flips %v disks\n", currPlayer.name, flips)
				break
			}
		}

		if !currPlayer.manual { // Change currPlayer to CPU
			// CPU will only select 1 space randomly
			for k := range currPlayer.possibleMoves {
				flips, _ := g.Mark(k, *currPlayer)
				fmt.Printf("%v chooses %v and flips %v disks\n", currPlayer.name, k, flips)
				g.RefreshState()
				break
			}
		}
	}

	g.Print()
	fmt.Println("End")

}
