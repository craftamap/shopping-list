import { HandlerContext, Handlers } from "$fresh/server.ts";
import { listService } from "../../../../services/list-service.ts";

export const handler: Handlers = {
  async PUT(req, ctx) {
    const listId = ctx.params.listid;
    const data = await req.json();
    listService.updateListStatus(listId, data.status)
    return new Response(JSON.stringify(listService.getList(listId)));
  },
};
