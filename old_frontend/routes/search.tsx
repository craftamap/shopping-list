import { Handlers } from "https://deno.land/x/fresh@1.1.1/server.ts";
import Header from "../components/Header.tsx";
import Main from "../components/Main.tsx";
import Root from "../components/static/Root.tsx";
import SearchIsland from "../islands/SearchIsland.tsx";
import { authMiddleware } from "../middleware/auth.ts";
import { AuthState } from "../middleware/auth.ts";

export const handler: Handlers<
  AuthState
> = {
  GET(_req, ctx) {
    const handler = async () => {
      return await ctx.render();
    };
    return authMiddleware(_req, {
      ...ctx,
      next: handler,
    });
  },
};

export default function Search() {
  return (
    <Root>
      <Header
        title={"Search"}
        backlinkUrl="/list"
      />
      <Main>
        <SearchIsland />
      </Main>
    </Root>
  );
}
