import { Handlers } from "$fresh/server.ts";
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
    console.log("newId", newId);
    return new Response(JSON.stringify(listService.getItems(listId)));
  },
};
