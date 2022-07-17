/** @jsx h */
import { h } from "preact";
import { useCallback, useMemo, useState } from "preact/hooks";
import { tw } from "@twind";
import "preact/debug";
import { List } from "../db/index.ts";

export default function Status({ initialList }: { initialList: List }) {
  const [list, setList] = useState(initialList);

  const color = useMemo(() => {
    let color = "purple";
    if (list.status === "inprogress") {
      color = "yellow";
    }
    if (list.status === "done") {
      color = "gray";
    }
    return color;
  }, [list]);

  const updateListStatus = useCallback(async (newStatus: string) => {
    const response = await fetch(`/api/list/${list.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });
    if (response.ok) {
      setList(await response.json());
    }
  }, [list]);

  const onClick = useCallback(() => {
    console.log(list);
    if (list.status === "todo") {
      updateListStatus("inprogress");
    } else if (list.status === "inprogress") {
      updateListStatus("done");
    } else if (list.status === "done") {
      updateListStatus("todo");
    }
  }, [list]);

  return (
    <span
      class={tw`bg-${color}-500 text-${color}-200 p-1 rounded`}
      onClick={onClick}
    >
      {list.status.toUpperCase()}
    </span>
  );
}
