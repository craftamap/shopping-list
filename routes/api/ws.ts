import { Handlers } from "$fresh/server.ts";
import Log from "../../log.ts";
import { eventHub } from "../../services/hub.ts";

export const handler: Handlers = {
  GET(req, _ctx) {
    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onopen = (e) => {
      Log.info("new ws connection", e);
      eventHub.addSocket(socket);
    };
    socket.onmessage = (e) => {
      Log.info("onmessage", e);
    };
    socket.onclose = (_) => {
      eventHub.removeSocket(socket);
    };

    return response;
  },
};
