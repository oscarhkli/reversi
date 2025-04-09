import { ClientMessage, ServerMessage, ServerMessageType } from "./definitions";

let socket: WebSocket | null = null;

export function initWebSocket(serverUrl: string, playerName: string) {
  socket = new WebSocket(`${serverUrl}?name=${playerName}`);
  socket.onopen = () => console.log("Socket conected");

  socket.onmessage = (event) => {
    try {
      const resp: ServerMessage = JSON.parse(event.data);
      const handler = serverMessageHandler[resp.action as ServerMessageType];
      if (!handler) {
        console.error("Unknown message", event.data);
        return;
      }
      handler(resp);
    } catch (e) {
      console.error("Exception caught when handling event:", event.data, e);
    }
  };

  socket.onclose = () => console.log("Socket closed");
  socket.onerror = (error) => console.error("WebSocket error:", error);
}

export const serverMessageHandler: Partial<
  Record<ServerMessageType, (msg: ServerMessage) => void>
> = {};

export function registerHandler(
  type: ServerMessageType,
  handler: (msg: ServerMessage) => void
) {
  serverMessageHandler[type] = handler;
}

export function sendSocketMessage(msg: ClientMessage) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not connected.");
    return;
  }

  socket.send(JSON.stringify(msg));
}
