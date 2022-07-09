import { HandlerContext, Handlers } from "$fresh/server.ts";
import { getItems } from "../../../../db/index.ts";

export const handler: Handlers = {
  GET(req, ctx) {
    const listId = ctx.params.listid;
    console.log(listId);
    return new Response(JSON.stringify(getItems(listId)));
  },
};
