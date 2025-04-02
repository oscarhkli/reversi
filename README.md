# Reversi

Reversi is a full-stack multiplayer Reversi game with multiple rooms and real-time gameplay using WebSocket.

## Goal
- To learn Go and WebSocket for backend development
- To learn TypeScript for frontend development
- To see how far I can go with using vanilla TypeScript

## Design

Multiplayer turn-based game, in a nutshell, is a variant of a chatroom.

In a chatroom app:
1. Client A sends a message to the Chatroom Server.
2. Chatroom Server processes the message, and broadcast a message in the room.
3. Client B receives the message through the display of the Chatroom.
4. Continue...

In a turn-based game:
1. Client A sends a message containing the move details to the Game Server.
2. Game Server validates the message, calculates the next state, and broadcast the result in the game room.
3. Client B receives the results through the display of the game room.
4. Continue...

All communications within Clients and Server are formed by WebSocket.

TODO: Tradeoff between pure WebSocket vs hybrid of WebSocket & RESTful

## Roadmap
|  #  | Features                                                     | Status |
| :-: | ------------------------------------------------------------ |  :-:   |
|  1  | Console version of local multiplayer                         |  ✅    |
|  2  | Adopt Gorilla for WebSocket                                  |  ✅    |
|  3  | E2E backend flow from registering to announcing result       |  🚧    |
|  4  | Basic frontend rendering                                     |  🚧    |
|  5  | Unhappy flows handling, e.g., client(s) leaving unexpectedly |  🚧    |
|  6  | Cosmetic fine tune for frontend                              |  ⏳    |
|  7  | Security features                                            |  ⏳    |
|  8  | Production ready                                             |  ⏳    |
|  ?  | Others, e.g., User account, Ranking, DB/Redis/AWS adoption   |  ⏳    |

[Visit oscarhkli.com for more](https://oscarhkli.com/)