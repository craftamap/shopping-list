/** @jsx h */
import { h } from "preact";
import Root from "../../components/static/Root.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Header from "../../components/Header.tsx";
import Main from "../../components/Main.tsx";
import { listService } from "../../services/list-service.ts";
import { List as ListType } from "../../db/index.ts";
import { tw } from "../../utils/twind.ts";
import Status from "../../islands/Status.tsx";

export const handler: Handlers<ListType[]> = {
  GET(_req, ctx) {
    const lists = listService.getLists();
    return ctx.render(lists);
  },
};

export default function List(props: PageProps<ListType[]>) {
  const shoppingLists = props.data.map((list) => {
    console.log(list.date);
    return (
      <div class={tw`flex items-center p-1`}>
        <a href={`/list/${list.id}`} class={tw`flex-grow`}>
          {list.date.toLocaleString()} ({list.id})
        </a>
        <Status initialList={list} />
      </div>
    );
  });

  return (
    <Root>
      <Header title={"Shopping Lists"} />
      <Main>
        {shoppingLists}
        <div class={tw`fixed bottom-6 right-6`}>
          <a
            class={tw
              `p-2 bg-green-500 text-white display-block aspect-square rounded-full`}
            href="/list/add"
          >
            +
          </a>
        </div>
      </Main>
    </Root>
  );
}
