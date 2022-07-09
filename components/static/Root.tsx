/** @jsx h */
import { ComponentChildren, Fragment, h } from "preact";
import { PageProps } from "$fresh/server.ts";
import { tw } from "../../utils/twind.ts";

export default function Root(props) {
  return (
    <div class={tw`height-100`}>
      {props.children}
    </div>
  );
}
