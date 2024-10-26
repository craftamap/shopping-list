import { Handlers } from "$fresh/server.ts";
import { listService } from "../../../services/list-service.ts";

export const handler: Handlers = {
  GET(req) {
    return new Response(JSON.stringify(listService.getLists()));
  },
};
