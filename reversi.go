package main

import "fmt"

type Point struct {
	X int
	Y int
}

func possibleMoves(board [][]int, self int) map[Point]bool {
	width := len(board)
	height := len(board[0])

	p := make(map[Point]bool)

	oppo := 1
	if self == 1 {
		oppo = 2
	}

	dirs := [8][2]int{
		{-1, 0}, {1, 0}, {0, -1}, {0, 1},
		{-1, -1}, {-1, 1}, {1, -1}, {1, 1},
	}

	for y, row := range board {
		for x, cell := range row {
			if cell != oppo {
				continue
			}

			for _, dir := range dirs {
				dy, dx := dir[0], dir[1]
				ny, nx := y+dy, x+dx

				if nx < 0 || nx >= width || ny < 0 || ny >= width || board[ny][nx] != 0 {
					continue
				}
				for j, i := x-dx, y-dy; j >= 0 && j < width && i >= 0 && i <= height; j, i = j-dx, i-dy {
					if board[j][i] == 0 {
						break
					}
					if board[j][i] == self {
						p[Point{nx, ny}] = true
					}
				}
			}
		}
	}

	return p
}

func main() {
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
	fmt.Println(possibleMoves(board, 1))
}
