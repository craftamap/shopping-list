import { Handlers } from "$fresh/server.ts";
import { listService } from "../../../../services/list-service.ts";

export const handler: Handlers = {
  GET(req, ctx) {
    const itemId = ctx.params.itemId;
    const item = listService.getItem(itemId);
    console.log(item?.list);
    return Response.redirect(new URL(`/list/${item?.list}`, req.url), 302);
  },
};
