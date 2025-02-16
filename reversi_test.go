package main

import (
	"reflect"
	"sort"
	"testing"
)

func TestPossibleMoves(t *testing.T) {
	g := GameBoard{
		cfg: NewConfig(),
		board: [][]int{
			{0, 0, 0, 0, 0, 0, 0, 0},
			{0, 0, 0, 0, 0, 0, 0, 0},
			{0, 0, 0, 0, 0, 0, 0, 0},
			{0, 0, 0, 1, 2, 0, 0, 0},
			{0, 0, 0, 2, 1, 0, 0, 0},
			{0, 0, 0, 0, 0, 0, 0, 0},
			{0, 0, 0, 0, 0, 0, 0, 0},
			{0, 0, 0, 0, 0, 0, 0, 0},
		},
	}

	if got, want := g.possibleMoves(1), map[Point][]Point{
		{4, 2}: {{4, 3}},
		{5, 3}: {{4, 3}},
		{2, 4}: {{3, 4}},
		{3, 5}: {{3, 4}},
	}; !equalMapUnorderedSlice(got, want) {
		t.Errorf("possibleMoves(%v, %v), want: %v, got %v", "board", 1, want, got)
	}
}

func TestPossibleMovesForDiagonals(t *testing.T) {
	g := GameBoard{
		cfg: NewConfig(),
		board: [][]int{
			{0, 0, 0, 0, 0, 0, 0, 0},
			{0, 0, 0, 0, 0, 0, 0, 0},
			{0, 0, 0, 0, 2, 0, 0, 0},
			{0, 0, 0, 1, 2, 1, 0, 0},
			{0, 0, 0, 2, 2, 0, 0, 0},
			{0, 0, 0, 0, 0, 0, 0, 0},
			{0, 0, 0, 0, 0, 0, 0, 0},
			{0, 0, 0, 0, 0, 0, 0, 0},
		},
	}

	if got, want := g.possibleMoves(1), map[Point][]Point{
		{3, 1}: {{4, 2}},
		{5, 1}: {{4, 2}},
		{3, 5}: {{3, 4}, {4, 4}},
		{5, 5}: {{4, 4}},
	}; !equalMapUnorderedSlice(got, want) {
		t.Errorf("possibleMoves(%v, %v), want: %v, got %v", "board", 1, want, got)
	}
}

func TestPossibleMovesForAllDirections(t *testing.T) {
	g := GameBoard{
		cfg: NewConfig(),
		board: [][]int{
			{0, 2, 2, 2, 2, 2, 2, 2},
			{0, 2, 1, 1, 1, 1, 1, 2},
			{0, 2, 1, 1, 1, 1, 1, 2},
			{0, 2, 1, 1, 0, 1, 1, 2},
			{0, 2, 1, 1, 1, 1, 1, 2},
			{0, 2, 1, 1, 1, 1, 1, 2},
			{0, 2, 2, 2, 2, 2, 2, 2},
			{0, 0, 0, 0, 0, 0, 0, 0},
		},
	}

	if got, want := g.possibleMoves(2), map[Point][]Point{
		{4, 3}: {
			{2, 1}, {4, 1}, {6, 1},
			{3, 2}, {4, 2}, {5, 2},
			{2, 3}, {3, 3}, {5, 3}, {6, 3},
			{3, 4}, {4, 4}, {5, 4},
			{2, 5}, {4, 5}, {6, 5},
		},
	}; !equalMapUnorderedSlice(got, want) {
		t.Errorf("possibleMoves(%v, %v), want: %v, got %v", "board", 1, want, got)
	}
}

func equalMapUnorderedSlice(got, want map[Point][]Point) bool {
	if len(got) != len(want) {
		return false
	}
	for k, gotV := range got {
		wantV, ok := want[k]
		if !ok {
			return false
		}
		sort.Slice(gotV, func(i, j int) bool {
			if gotV[i].X == gotV[j].X {
				return gotV[i].Y < gotV[j].Y
			}
			return gotV[i].X < gotV[j].X
		})
		sort.Slice(wantV, func(i, j int) bool {
			if wantV[i].X == wantV[j].X {
				return wantV[i].Y < wantV[j].Y
			}
			return wantV[i].X < wantV[j].X
		})
		if !reflect.DeepEqual(gotV, wantV) {
			return false
		}
	}
	return true
}
