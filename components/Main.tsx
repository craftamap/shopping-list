/** @jsx h */
import { ComponentChildren, h } from "preact";
import { tw } from "../utils/twind.ts";

export default function Main({ children }: { children: ComponentChildren }) {
  return (
    <main class={tw`max-w-screen-md mx-auto mt-4 px-2`}>
      {children}
    </main>
  );
}
