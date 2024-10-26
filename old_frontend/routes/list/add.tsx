import { listService } from "../../services/list-service.ts";
import { Handlers, PageProps } from "$fresh/server.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    const listId = listService.addList();
    return Response.redirect(new URL(`/list/${listId}`, _req.url));
  },
};
