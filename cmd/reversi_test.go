package main

import (
	"errors"
	"reflect"
	"sort"
	"testing"
)

func TestPossibleMoves(t *testing.T) {
	g := GameBoard{
		cfg: defaultGameConfig(),
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

	if got, want := g.PossibleMoves(1), map[Point][]Point{
		{4, 2}: {{4, 3}},
		{5, 3}: {{4, 3}},
		{2, 4}: {{3, 4}},
		{3, 5}: {{3, 4}},
	}; !equalMapUnorderedSlice(got, want) {
		t.Errorf("PossibleMoves(%v, %v), want: %v, got %v", "board", 1, want, got)
	}
}

func TestPossibleMovesForDiagonals(t *testing.T) {
	g := GameBoard{
		cfg: defaultGameConfig(),
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

	if got, want := g.PossibleMoves(1), map[Point][]Point{
		{3, 1}: {{4, 2}},
		{5, 1}: {{4, 2}},
		{3, 5}: {{3, 4}, {4, 4}},
		{5, 5}: {{4, 4}},
	}; !equalMapUnorderedSlice(got, want) {
		t.Errorf("PossibleMoves(%v, %v), want: %v, got %v", "board", 1, want, got)
	}
}

func TestPossibleMovesForAllDirections(t *testing.T) {
	g := GameBoard{
		cfg: defaultGameConfig(),
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

	if got, want := g.PossibleMoves(2), map[Point][]Point{
		{4, 3}: {
			{2, 1}, {4, 1}, {6, 1},
			{3, 2}, {4, 2}, {5, 2},
			{2, 3}, {3, 3}, {5, 3}, {6, 3},
			{3, 4}, {4, 4}, {5, 4},
			{2, 5}, {4, 5}, {6, 5},
		},
	}; !equalMapUnorderedSlice(got, want) {
		t.Errorf("PossibleMoves(%v, %v), want: %v, got %v", "board", 1, want, got)
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

func TestPointToNotation(t *testing.T) {
	tests := map[string]struct {
		notation Notation
		point    Point
		err      error
	}{
		"valid input": {
			point:    Point{0, 4},
			notation: "a5",
			err:      nil,
		},
		"another valid input": {
			point:    Point{6, 1},
			notation: "g2",
			err:      nil,
		},
		"out of y-range": {
			point:    Point{5, 10},
			notation: "",
			err:      errors.New("invalid input"),
		},
		"out of x-range": {
			point:    Point{4, 12},
			notation: "",
			err:      errors.New("invalid input"),
		},
		"irrelavant input": {
			point:    Point{-1, -1},
			notation: "",
			err:      errors.New("invalid input"),
		},
	}
	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			got, gotError := test.point.ToNotation()
			want, wantError := test.notation, test.err
			if got != want || (gotError != nil && wantError == nil) {
				t.Errorf("%v.ToNotation(), want: (%v, %v), got (%v, %v)", test.point, want, wantError, got, gotError)
			}
		})
	}
}

func TestNotationToPoint(t *testing.T) {
	tests := map[string]struct {
		notation Notation
		point    Point
		err      error
	}{
		"valid input": {
			notation: "a5",
			point:    Point{0, 4},
			err:      nil,
		},
		"another valid input": {
			notation: "g2",
			point:    Point{6, 1},
			err:      nil,
		},
		"out of y-range": {
			notation: "a9",
			point:    Point{},
			err:      errors.New("invalid input"),
		},
		"out of x-range": {
			notation: "x6",
			point:    Point{},
			err:      errors.New("invalid input"),
		},
		"irrelavant input": {
			notation: "asdlfkjasldf",
			point:    Point{},
			err:      errors.New("invalid input"),
		},
	}
	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			got, gotError := test.notation.ToPoint()
			want, wantError := test.point, test.err
			if got != want || (gotError != nil && wantError == nil) {
				t.Errorf("%v.ToPoint(), want: (%v, %v), got (%v, %v)", test.notation, want, wantError, got, gotError)
			}
		})
	}
}
