package main

import (
	"reflect"
	"testing"
)

func TestPossibleMoves(t *testing.T) {
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

	if got, want := possibleMoves(board, 1), map[Point]bool{
		{4, 2}: true,
		{5, 3}: true,
		{2, 4}: true,
		{3, 5}: true,
	}; !reflect.DeepEqual(got, want) {
		t.Errorf("possibleMoves(%v, %v), want: %v, got %v", "board", 1, want, got)
	}
}

func TestPossibleMovesForDiagonals(t *testing.T) {
	board := [][]int{
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 1, 2, 0, 0, 0},
		{0, 0, 0, 2, 2, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0},
	}

	if got, want := possibleMoves(board, 1), map[Point]bool{
		{5, 3}: true,
		{3, 5}: true,
		{5, 5}: true,
	}; !reflect.DeepEqual(got, want) {
		t.Errorf("possibleMoves(%v, %v), want: %v, got %v", "board", 1, want, got)
	}
}
