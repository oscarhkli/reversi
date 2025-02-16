package main

import (
	"fmt"
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

type GameBoard struct {
	cfg     GameConfig
	board   [][]int
	turn    int
	p1Turn  bool
	p1Score int
	p2Score int
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
	return &GameBoard{
		cfg:     cfg,
		board:   board,
		turn:    1,
		p1Turn:  cfg.p1First,
		p1Score: 0,
		p2Score: 0,
	}
}

func (g GameBoard) Print() {
	var sb strings.Builder
	line := "+-+-+-+-+-+-+-+-+-+\n"

	sb.WriteString(line)
	sb.WriteString("| |a|b|c|d|e|f|g|h|\n")
	sb.WriteString(line)
	for i, row := range g.board {
		sb.WriteString(fmt.Sprintf("|%d|", i+1))
		for _, cell := range row {
			if cell == 1 {
				sb.WriteString("●")
			} else if cell == 2 {
				sb.WriteString("○")
			} else {
				sb.WriteString(" ")
			}
			sb.WriteString("|")
		}
		sb.WriteString("\n")
		sb.WriteString(line)
	}
	sb.WriteString(fmt.Sprintf("P1: %2d | P2: %2d\n", g.p1Score, g.p2Score))

	fmt.Print(sb.String())
}

func (g GameBoard) possibleMoves(player int) map[Point][]Point {
	width, height := g.cfg.width, g.cfg.height

	pMoves := make(map[Point][]Point)

	// If player is 1, oppo is 2; if player is 2; oppo is 1
	oppo := 1
	if player == 1 {
		oppo = 2
	}

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

				if tx == 0 || tx == width || ty == 0 || ty == height || g.board[ty][tx] != 0 {
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

func main() {
	g := NewGameBoard(NewConfig())
	g.Print()
}
