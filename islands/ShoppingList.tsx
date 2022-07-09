/** @jsx h */
import "preact/debug";
import "preact/devtools";
import { Fragment, h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { tw } from "@twind";

function ShoppingListItem(
  { id, text, checked, children, depth = 0, onChecked, onDelete, sort }:
    & ListItem
    & {
      depth?: number;
      onChecked: (id: string, checked: boolean) => void;
      onDelete: (id: string) => void;
    },
) {
  const childrenItems = (children || []).map((item) => {
    return (
      <ShoppingListItem
        id={item.id}
        text={item.text}
        checked={item.checked}
        children={item.children}
        sort={item.sort}
        depth={depth + 1}
        onChecked={onChecked}
        onDelete={onDelete}
      />
    );
  });

  const indent = `pl-${depth * 4}`;
  const itemRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [dropAreaHovered, setDropAreaHovered] = useState<boolean>(false);

  const move = (id: string, after: string) => {
    fetch(`/api/list/1/item/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ "after": after }),
    });
  };

  const moveAfterParent = (id: string, parent: string) => {
    fetch(`/api/list/1/item/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ "parent": parent }),
    });

  }

  return (
    <Fragment>
      <div
        ref={itemRef}
        data-id={id}
        class={tw`${indent}`}
        draggable
        onDragStart={(e) => {
          console.log(e);
          e.dataTransfer!.effectAllowed = "move";
          e.dataTransfer?.setData("text/plain", id);
        }}
      >
        <div
          class={tw`flex py-2 items-center `}
        >
          <div ref={dragRef}>⠿</div>
          <label class={tw`text-lg flex flex-grow-1`}>
            <input
              type="checkbox"
              checked={checked}
              class={tw`mr-1`}
              onClick={(e) => {
                e.preventDefault();
                onChecked(id, e.currentTarget.checked);
              }}
            />
            <span>
              <span class={tw`text-xs`}>{id.substring(0, 4)} </span>
               {text}
              <span class={tw`text-xs text-purple`}> {sort}</span>
            </span>
          </label>
          <button class={tw`p-1 rounded hover:bg-gray-200`}>⇐</button>
          <button class={tw`p-1 rounded hover:bg-gray-200`}>⇒</button>
          <button
            class={tw`p-1 rounded hover:bg-gray-200`}
            onClick={() => onDelete(id)}
          >
            x
          </button>
        </div>
        <div
          class={tw`${
            dropAreaHovered
              ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
              : ""
          } h-1 w-[45%] inline-block border-none!`}
          onDragEnter={() => {
            setDropAreaHovered(true);
          }}
          onDragLeave={() => {
            setDropAreaHovered(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            console.log(e);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const itemToMove = e.dataTransfer!.getData("text/plain");
            const after = id;
            move(itemToMove, after);

            setDropAreaHovered(false);
          }}
        >
        </div>
        <div
          class={tw`${
            dropAreaHovered
              ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
              : ""
          } h-1 w-[45%] inline-block border-none!`}
          onDragEnter={() => {
            setDropAreaHovered(true);
          }}
          onDragLeave={() => {
            setDropAreaHovered(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            console.log(e);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const itemToMove = e.dataTransfer!.getData("text/plain");
            const parent = id;
            moveAfterParent(itemToMove, parent);

            setDropAreaHovered(false);
          }}
        >
        </div>
      </div>
      {childrenItems}
    </Fragment>
  );
}

function NewShoppingListItem(
  { onClick }: { onClick: (value?: string) => void },
) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div class={tw`flex`}>
      <input
        ref={inputRef}
        class={tw`flex-grow-1 border-b-1 border-solid`}
        type="text"
      />
      <button
        class={tw`p-1 rounded hover:bg-gray-200`}
        onClick={(_) => {
          onClick(inputRef?.current?.value);
        }}
      >
        +
      </button>
    </div>
  );
}

export interface ListItem {
  id: string;
  text: string;
  checked: boolean;
  children?: ListItem[];
  sort: number;
}

export default function ShoppingList(
  { initialItems }: { initialItems: ListItem[] },
) {
  const [items, setItems] = useState(initialItems || []);

  const reload = async () => {
    const id = "1";
    const response = await fetch(`/api/list/${id}/item`);
    setItems(await response.json() as unknown as ListItem[]);
  };

  useEffect(() => {
    if (!IS_BROWSER) {
      return;
    }
    const ws = new WebSocket("ws://localhost:8000/api/ws");
    ws.onmessage = (e) => {
      reload();
    };
  }, []);

  const addItem = async (value: string) => {
    const id = "1";
    const response = await fetch(`/api/list/${id}/item`, {
      method: "PUT",
      body: JSON.stringify({
        text: value,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    setItems(await response.json() as unknown as ListItem[]);
  };

  const updateItemChecked = async (itemId: string, checked: boolean) => {
    const listId = "1";
    const response = await fetch(`/api/list/${listId}/item/${itemId}/checked`, {
      method: "PUT",
      body: JSON.stringify({
        checked: checked,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    setItems(await response.json() as unknown as ListItem[]);
  };

  const deleteItem = async (itemId: string) => {
    const listId = "1";
    const response = await fetch(`/api/list/${listId}/item/${itemId}`, {
      method: "DELETE",
    });
    setItems(await response.json() as unknown as ListItem[]);
  };

  const shoppingListItems = useMemo(() => {
    return items.map((item) => {
      return (
        <ShoppingListItem
          id={item.id}
          text={item.text}
          checked={item.checked}
          children={item.children}
          sort={item.sort}
          onChecked={updateItemChecked}
          onDelete={deleteItem}
        />
      );
    });
  }, [items]);

  return (
    <div class={tw`divide-y divide-solid`}>
      {shoppingListItems}
      <NewShoppingListItem
        onClick={(value) => {
          if (value) {
            addItem(value);
          }
        }}
      />
    </div>
  );
}
