import { Handlers } from "$fresh/server.ts";
import { listService } from "../../../../../services/list-service.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    const listId = ctx.params.listid;
    console.log(listId);
    return new Response(JSON.stringify(listService.getItems(listId)));
  },
  async POST(req, ctx) {
    const listId = ctx.params.listid;
    const data = await req.json();
    const newId = listService.putItem({ listId, text: data?.text });
    if (data?.after) {
      listService.moveItem(newId, { after: data?.after });
    }
    return new Response(JSON.stringify(listService.getItems(listId)));
  },
};
