/** @jsx h */
import { h } from "preact";
import { tw } from "../utils/twind.ts";

export default function Header({title}: { title: string }) {
  return (
    <header class={tw`py-4 px-2  shadow-lg`}>
            <h1 class={tw`text-xl font-bold`}>{title}</h1>
    </header>
  );
}
