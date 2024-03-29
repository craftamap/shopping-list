import { Handlers } from "$fresh/server.ts";
import { listService } from "../../../../../../services/list-service.ts";

export const handler: Handlers = {
  async PUT(req, ctx) {
    const itemId = ctx.params.itemid;
    const listId = ctx.params.listid;
    const data = await req.json();
    listService.putItemChecked(itemId, data.checked);
    const allItems = listService.getItems(listId);
    console.log("allItems", allItems);
    return new Response(JSON.stringify(allItems));
  },
};
