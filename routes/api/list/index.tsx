import { Handlers } from "$fresh/server.ts";
import { getLists } from "../../../db/index.ts";

export const handler: Handlers = {
  GET(req) {
    return new Response(JSON.stringify(getLists()));
  },
};
