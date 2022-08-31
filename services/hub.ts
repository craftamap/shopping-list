import Log from "../log.ts";

class EventHub {
  #sockets = new Set<WebSocket>();

  addSocket(socket: WebSocket) {
    this.#sockets.add(socket);
    Log.info(this.#sockets);
  }

  removeSocket(socket: WebSocket) {
    this.#sockets.delete(socket);
    Log.info(this.#sockets);
  }

  sendToClients(event: string) {
    this.#sockets.forEach((socket) => {
      socket.send(event);
    });
  }
}

export const eventHub = new EventHub();
