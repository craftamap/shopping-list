/** @jsx h */
import { h } from "preact";
import { tw } from "../utils/twind.ts";

export default function Header(
  { title, backlinkUrl }: { title: string; backlinkUrl?: string },
) {
  let backlink;
  if (backlinkUrl) {
    backlink = <a href={backlinkUrl} class={tw`pr-1`}>&lt;</a>;
  }
  return (
    <header class={tw`py-4 px-2  shadow-lg`}>
      <div class={tw`max-w-screen-md mx-auto`}>
        <title>{title}</title>
        <h1 class={tw`text-xl font-bold`}>{backlink}{title}</h1>
      </div>
    </header>
  );
}
