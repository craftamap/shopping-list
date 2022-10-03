import { Handlers } from "$fresh/server.ts";
import { itemsRepository } from "../../../../db/index.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    const listId = ctx.params.listid;
    console.log(listId);
    return new Response(JSON.stringify(itemsRepository.getAllByListId(listId)));
  },
};
