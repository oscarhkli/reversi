import { GameStateMessage, ServerMessageType } from "./definitions";
import { isCurrentPlayer, player } from "./game";

describe("sum function", () => {
  // beforeEach(() => {
  //   jest.mock("./app", () => ({
  //     __esModule: true,
  //     ...jest.requireActual("./app"),
  //     initServerMessageHandlers: jest.fn(),
  //     initButtonEvents: jest.fn(),
  //   }));
  // });

  describe("isCurrentPlayer", () => {
    test("GateStateCurrentPlayer ID is same as Player", () => {
      player.id = "ID_1";

      const resp: GameStateMessage = {
        action: ServerMessageType.GameState,
        message: {
          p1: {
            id: "ID_1",
            name: "PLAYER_NAME_1",
            token: 1,
            score: 0,
            possibleMoves: [],
          },
          p2: {
            id: "ID_2",
            name: "PLAYER_NAME_2",
            token: 2,
            score: 0,
            possibleMoves: [],
          },
          round: 0,
          turn: 0,
          currentPlayer: "ID_1",
          board: [],
        },
      };

      expect(isCurrentPlayer(resp)).toBeTruthy();
    });
  });


  test("GateStateCurrentPlayer ID is different from Player", () => {
    player.id = "ID_2";

    const resp: GameStateMessage = {
      action: ServerMessageType.GameState,
      message: {
        p1: {
          id: "ID_1",
          name: "PLAYER_NAME_1",
          token: 1,
          score: 0,
          possibleMoves: [],
        },
        p2: {
          id: "ID_2",
          name: "PLAYER_NAME_2",
          token: 2,
          score: 0,
          possibleMoves: [],
        },
        round: 0,
        turn: 0,
        currentPlayer: "ID_1",
        board: [],
      },
    };

    expect(isCurrentPlayer(resp)).toBeFalsy();
  });

});
