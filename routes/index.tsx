/** @jsx h */
import { h } from "preact";
import Root from "../components/static/Root.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Header from "../components/Header.tsx";
import Main from "../components/Main.tsx";
import ShoppingList, { ListItem } from "../islands/ShoppingList.tsx";
import { listService } from "../services/list-service.ts";

export const handler: Handlers<ListItem[]> = {
  GET(_req, ctx) {
    const items = listService.getItems("1");
    return ctx.render(items);
  },
};

export default function Home(props: PageProps<ListItem[]>) {
  return (
    <Root>
      <Header title={"Home"} />
      <Main>
        <ShoppingList initialItems={props.data} />
      </Main>
    </Root>
  );
}
