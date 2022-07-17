/** @jsx h */
import { h } from "preact";
import Root from "../components/static/Root.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Header from "../components/Header.tsx";
import Main from "../components/Main.tsx";
import ShoppingList, { ListItem } from "../islands/ShoppingList.tsx";
import { listService } from "../services/list-service.ts";

interface HomeData {
  items: ListItem[];
  list: List;
}

export const handler: Handlers<
  HomeData
> = {
  GET(_req, ctx) {
    const list = listService.getActiveList()!;
    // TODO: if no active list exists, create a new list.
    console.log("activeList", list);
    const items = listService.getItems(list.id) as ListItem[];
    return ctx.render({ items, list });
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
          listId={props.data.list.listId}
        />
      </Main>
    </Root>
  );
}
