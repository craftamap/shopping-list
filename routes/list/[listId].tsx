/** @jsx h */
import { h } from "preact";
import Root from "../../components/static/Root.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Header from "../../components/Header.tsx";
import Main from "../../components/Main.tsx";
import ShoppingList, { ListItem } from "../../islands/ShoppingList.tsx";
import { listService } from "../../services/list-service.ts";
import { List } from "../../db/index.ts";

interface ListIdData {
  items: ListItem[];
  list: List;
}

export const handler: Handlers<ListIdData> = {
  GET(_req, ctx) {
    const listId = ctx.params.listId;
    const items = listService.getItems(listId);
    const list = listService.getList(listId)!;
    return ctx.render({ items, list });
  },
};

export default function ListId(props: PageProps<ListIdData>) {
  return (
    <Root>
      <Header
        title={props.data.list.date.toLocaleString()}
        backlinkUrl="/list"
      />
      <Main>
        <ShoppingList listId={props.data.list.id} initialItems={props.data.items} />
      </Main>
    </Root>
  );
}
