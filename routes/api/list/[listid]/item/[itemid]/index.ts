import { HandlerContext, Handlers } from "$fresh/server.ts";
import { listService } from "../../../../../../services/list-service.ts";

export const handler: Handlers = {
  DELETE(_req, ctx) {
    const listId = ctx.params.listid;
    const itemId = ctx.params.itemid;
    listService.deleteItem(itemId);
    return new Response(JSON.stringify(listService.getItems(listId)));
  },
};
