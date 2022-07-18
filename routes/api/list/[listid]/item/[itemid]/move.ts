import { Handlers } from "$fresh/server.ts";
import {
  listService,
  MoveOperation,
} from "../../../../../../services/list-service.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    const listId = ctx.params.listid;
    const itemId = ctx.params.itemid;
    const moveOperation: MoveOperation = await req.json();
    listService.moveItem(itemId, moveOperation);
    return new Response(JSON.stringify(listService.getItems(listId)));
  },
};
