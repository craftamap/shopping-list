import { HandlerContext, Handlers } from "$fresh/server.ts";
import { listService } from "../../../../../services/list-service.ts";

export const handler: Handlers = {
  GET(req, ctx) {
    const listId = ctx.params.listid;
    console.log(listId);
    return new Response(JSON.stringify(listService.getItems(listId)));
  },
  async PUT(req, ctx) {
    const listId = ctx.params.listid;
    const data = await req.json();
    listService.putItem({ listId, text: data?.text });
    return new Response(JSON.stringify(listService.getItems(listId)));
  },
};
