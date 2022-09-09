import { ComponentChildren } from "preact";
import { PageProps } from "$fresh/server.ts";

export default function Root(props) {
  return (
    <div class="height-100">
      {props.children}
    </div>
  );
}
