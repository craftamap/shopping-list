import Root from "../components/static/Root.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Header from "../components/Header.tsx";
import Main from "../components/Main.tsx";
import ShoppingList, { ListItem } from "../islands/ShoppingList.tsx";
import { listService } from "../services/list-service.ts";
import { List } from "../db/index.ts";
import { authMiddleware, AuthState } from "../middleware/auth.ts";

interface HomeData {
  items: ListItem[];
  list: List;
}

export const handler: Handlers<
  HomeData,
  AuthState
> = {
  GET(_req, ctx) {
    const handler = async () => {
      const list = listService.getActiveList()!;
      // TODO: if no active list exists, create a new list.
      console.log("activeList", list);
      const items = listService.getItems(list.id) as ListItem[];
      return await ctx.render({ items, list });
    };
    return authMiddleware(_req, {
      ...ctx,
      next: handler,
    });
  },
};

export default function Home(
  props: PageProps<HomeData>,
) {
  return (
    <Root>
      <Header
        title={`Home (${props.data.list.date?.toLocaleString()})`}
        backlinkUrl="/list"
      />
      <Main>
        <ShoppingList
          initialItems={props.data.items}
          listId={props.data.list.id}
        />
      </Main>
    </Root>
  );
}
