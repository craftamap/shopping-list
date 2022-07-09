class EventHub {
  #sockets = new Set<WebSocket>();

  addSocket(socket: WebSocket) {
    this.#sockets.add(socket);
    console.log(this.#sockets);
  }

  removeSocket(socket: WebSocket) {
    this.#sockets.delete(socket);
    console.log(this.#sockets);
  }

  sendToClients(event: string) {
    this.#sockets.forEach((socket) => {
      socket.send(event);
    });
  }
}

export const eventHub = new EventHub();
