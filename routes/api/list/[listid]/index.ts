import { Handlers } from "$fresh/server.ts";
import { getItems } from "../../../../db/index.ts";
import Log from "../../../../log.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    const listId = ctx.params.listid;
    Log.info(listId);
    return new Response(JSON.stringify(getItems(listId)));
  },
};
