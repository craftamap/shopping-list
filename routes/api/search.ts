import { Handlers } from "https://deno.land/x/fresh@1.1.1/server.ts";
import { searchService } from "../../services/search.ts";

export const handler: Handlers = {
  async GET(req) {
    const u = new URL(req.url);
    const term = u.searchParams.get("term");
    if (!term) {
      return new Response(
        JSON.stringify({
          error: "no term found",
        }),
        {
          status: 500,
        },
      );
    }
    const searchResult = await searchService.search(term);
    searchResult.elapsed = "";
    return new Response(JSON.stringify(searchResult));
  },
};
