/** @jsx h */
import "preact/debug";
import "preact/devtools";
import { createContext, Fragment, h } from "preact";
import { useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { tw } from "@twind";
import Log from "../log.ts";

function urlify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}">${url}</a>`;
  });
}

const ListIdContext = createContext("");

function DropArea(
  { id, onDrop, width }: {
    id: string;
    onDrop: (item: string, id: string) => void;
    width?: string;
  },
) {
  const [dropAreaHovered, setDropAreaHovered] = useState<boolean>(false);

  return (
    <div
      class={tw`${
        dropAreaHovered
          ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          : ""
      } h-1 w-[${width ?? "50%"}] inline-block border-none!`}
      onDragEnter={() => {
        setDropAreaHovered(true);
      }}
      onDragLeave={() => {
        setDropAreaHovered(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        Log.info(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const itemToMove = e.dataTransfer!.getData("text/plain");

        onDrop(itemToMove, id);

        setDropAreaHovered(false);
      }}
    >
    </div>
  );
}

function ShoppingListItem(
  { id, text, checked, children, depth = 0, onChecked, onDelete, sort }:
    & ListItem
    & {
      depth?: number;
      onChecked: (id: string, checked: boolean) => void;
      onDelete: (id: string) => void;
    },
) {
  const listId = useContext(ListIdContext);

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

  const [asInput, setAsInput] = useState(text.trim() === "");

  const indent = `pl-${depth * 4}`;
  const itemRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asInput && inputRef.current) {
      Log.info("focus");
      inputRef.current.focus();
    }
  }, [asInput]);
  Log.info(listId);

  const move = (id: string, after: string) => {
    fetch(`/api/list/${listId}/item/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ "after": after }),
    });
  };

  const moveAfterParent = (id: string, parent: string) => {
    fetch(`/api/list/${listId}/item/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ "parent": parent }),
    });
  };

  const addItemAfter = async (value: string) => {
    await fetch(`/api/list/${listId}/item`, {
      method: "POST",
      body: JSON.stringify({
        text: value,
        after: id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  const updateItem = async (value: string) => {
    await fetch(`/api/list/${listId}/item/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        text: value,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  const urlifiedText = urlify(
    text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(
      ">",
      "&gt;",
    ).replaceAll('"', "&quot;").replaceAll("'", "&#039;"),
  );
  return (
    <Fragment>
      <div
        ref={itemRef}
        data-id={id}
        class={tw`${indent} flex py-2 items-center `}
        draggable
        onDragStart={(e) => {
          Log.info(e);
          e.dataTransfer!.effectAllowed = "move";
          e.dataTransfer?.setData("text/plain", id);
        }}
      >
        <div
          ref={dragRef}
        >
          ⠿
        </div>
        <label class={tw`text-lg flex flex-grow-1`}>
          <input
            type="checkbox"
            checked={checked}
            class={tw`mr-1 accent-violet-700`}
            onClick={(e) => {
              e.preventDefault();
              onChecked(id, e.currentTarget.checked);
            }}
          />
          {!asInput && (
            <span
              class={tw`min-w-[4em] flex-grow-1 item--text`}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName !== "SPAN") {
                  return;
                }
                e.preventDefault();
                setAsInput(true);
              }}
              dangerouslySetInnerHTML={{ __html: urlifiedText }}
            />
          )}
          {asInput && (
            <input
              enterkeyhint="send"
              autofocus
              ref={inputRef}
              draggable={false}
              class={tw`border-solid border-b-1 border-b-blue-500 flex-grow-1`}
              type="text"
              value={text}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onBlur={() => {
                // TODO: updateValue()
                setAsInput(false);
                if (inputRef.current!.value === "") {
                  onDelete(id);
                }
                updateItem(inputRef.current!.value);
              }}
              onSubmit={(e) => {
                alert(e);
              }}
              onKeyUp={(e) => {
                if (e.key === "Escape") {
                  inputRef.current!.blur();
                }
                if (e.key === "Enter") {
                  // update
                  inputRef.current!.blur();
                  if (inputRef.current!.value === "") {
                    onDelete(id);
                  } else {
                    addItemAfter("");
                  }
                }
              }}
            />
          )}
          {false && <span class={tw`text-xs`}>( {id.substring(0, 4)} ,</span>}
          {false && <span class={tw`text-xs text-purple-500`}>{sort} )</span>}
        </label>
        <button
          class={tw`p-1 rounded hover:bg-gray-200`}
          onClick={() => onDelete(id)}
        >
          x
        </button>
      </div>
      <div
        class={tw`${indent} border-none! leading-[0]`}
      >
        <DropArea
          id={id}
          onDrop={(itemToMove: string, id: string) => {
            move(itemToMove, id);
          }}
          width="10%"
        />
        <DropArea
          width="90%"
          id={id}
          onDrop={(itemToMove: string, id: string) => {
            moveAfterParent(itemToMove, id);
          }}
        />
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
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            onClick(inputRef?.current?.value);
            inputRef!.current!.value = "";
          }
        }}
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
  { listId, initialItems }: { listId: string; initialItems: ListItem[] },
) {
  const [items, setItems] = useState(initialItems || []);

  const reload = async () => {
    const response = await fetch(`/api/list/${listId}/item`);
    setItems(await response.json() as unknown as ListItem[]);
  };

  useEffect(() => {
    if (!IS_BROWSER) {
      return;
    }
    function connect() {
      const loc = window.location;
      let newUri;
      if (loc.protocol === "https:") {
        newUri = "wss:";
      } else {
        newUri = "ws:";
      }
      newUri += "//" + loc.host + "/api/ws";
      const ws = new WebSocket(newUri);
      ws.onmessage = (e) => {
        reload();
      };
      ws.onerror = (e) => {
        // Try to reconnect in 5 seconds
        Log.info("ws encountered error, reconnecting in 5 seconds");
        setTimeout(connect, 5000);
      };
      ws.onclose = (e) => {
        // Try to reconnect in 5 seconds
        Log.info("ws , reconnecting in 5 seconds");
        setTimeout(connect, 5000);
      };
    }

    connect();
  }, []);

  const addItem = async (value: string) => {
    const response = await fetch(`/api/list/${listId}/item`, {
      method: "POST",
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
    <ListIdContext.Provider value={listId}>
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
    </ListIdContext.Provider>
  );
}
