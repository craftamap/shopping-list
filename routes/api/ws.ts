import { HandlerContext, Handlers } from "$fresh/server.ts";
import { eventHub } from "../../services/hub.ts";

export const handler: Handlers = {
  GET(req, ctx) {
    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onopen = (e) => {
      console.log("new ws connection", e);
      eventHub.addSocket(socket);
    };
    socket.onmessage = (e) => {
      console.log("onmessage", e);
    };
    socket.onclose = (_) => {
      eventHub.removeSocket(socket);
    }

    return response;
  },
};
