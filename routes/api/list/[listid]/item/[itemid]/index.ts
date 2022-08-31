import { Handlers } from "$fresh/server.ts";
import Log from "../../../../../../log.ts";
import { listService } from "../../../../../../services/list-service.ts";

export const handler: Handlers = {
  DELETE(_req, ctx) {
    const listId = ctx.params.listid;
    const itemId = ctx.params.itemid;
    listService.deleteItem(itemId);
    return new Response(JSON.stringify(listService.getItems(listId)));
  },
  async PUT(req, ctx) {
    const listId = ctx.params.listid;
    const itemId = ctx.params.itemid;
    const data = await req.json();
    const newId = listService.updateItem(itemId, { text: data?.text });
    Log.info("newId", newId);
    return new Response(JSON.stringify(listService.getItems(listId)));
  },
};
