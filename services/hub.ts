class EventHub {
  #sockets = new Set<WebSocket>();

  addSocket(socket: WebSocket) {
    this.#sockets.add(socket);
  }

  removeSocket(socket: WebSocket) {
    this.#sockets.delete(socket);
  }

  sendToClients(event: string) {
    this.#sockets.forEach((socket) => {
      socket.send(event);
    });
  }
}

export const eventHub = new EventHub();
