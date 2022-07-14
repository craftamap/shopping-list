/** @jsx h */
import { h } from "preact";
import Root from "../components/static/Root.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Header from "../components/Header.tsx";
import Main from "../components/Main.tsx";
import ShoppingList, { ListItem } from "../islands/ShoppingList.tsx";
import { listService } from "../services/list-service.ts";
import { List as ListType } from "../db/index.ts";
import { tw } from "../utils/twind.ts";

export const handler: Handlers<ListType[]> = {
  GET(_req, ctx) {
    const lists = listService.getLists();
    return ctx.render(lists);
  },
};

function Status({ status }: { status: "todo" | "inprogress" | "done" }) {
  let color = "purple";
  if (status === "inprogress") {
    color = "yellow";
  }
  if (status === "done") {
    color = "gray";
  }
  return (
    <span class={tw`bg-${color}-500 text-${color}-200 p-1 rounded`}>
      {status.toUpperCase()}
    </span>
  );
}

export default function List(props: PageProps<ListType[]>) {
  const shoppingLists = props.data.map((list) => {
    console.log(list.date);
    return (
      <div class={tw`flex items-center p-1`}>
        <a href={`/list/${list.id}`} class={tw`flex-grow`}>{list.date.toLocaleDateString()} ({list.id})</a>
        <Status status={list.status} />
      </div>
    );
  });

  return (
    <Root>
      <Header title={"Shopping Lists"} />
      <Main>
        {shoppingLists}
      </Main>
    </Root>
  );
}
