import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { v4 as uuidV4 } from "https://deno.land/std@0.144.0/uuid/mod.ts";
import Log from "../log.ts";

const db = new DB("db.sqlite");

function tableExists(tableName: string): boolean {
  const rows = db.query(
    `SELECT name FROM sqlite_master WHERE type='table' and name=?`,
    [tableName],
  );
  return (rows.length > 0);
}

function createTable(
  tableName: string,
  columns: Record<string, string[]>,
  foreignKeys: [string, string][],
  options?: { drop?: boolean },
) {
  const exists = tableExists(tableName);
  if (exists && !options?.drop) {
    Log.warn(`table ${tableName} already exists; skipping creation`);
    return;
  } else if (exists) {
    db.execute(`DROP table ${tableName};`);
  }

  const columnDeclarations = Object.entries(columns).map(([key, value]) =>
    `${key} ${value.join(" ")}`
  ).join(",\n");

  const foreignKeysDeclarations = foreignKeys.map(([key, target]) =>
    `, FOREIGN KEY (${key}) REFERENCES ${target}`
  ).join(" ");

  const query =
    `CREATE TABLE ${tableName} (${columnDeclarations} ${foreignKeysDeclarations});`;
  Log.info(query);

  db.execute(
    query,
  );
}

createTable("lists", {
  id: ["text", "PRIMARY KEY", "NOT NULL"],
  status: ["text", "NOT NULL", 'DEFAULT "todo"'],
  date: ["text", "NOT NULL"],
}, []);

createTable(
  "items",
  {
    id: ["text", "PRIMARY KEY", "NOT NULL"],
    text: ["text", "NOT NULL"],
    checked: ["number", "NOT NULL"],
    list: ["text", "NOT NULL"],
    parent: ["text"],
    sort: ["real", "NOT NULL"],
    sortFractions: ["BLOB", "NOT NULL"],
  },
  [["list", "lists (id)"], ["parent", "items (id)"]],
);

createTable(
  "sessions",
  {
    id: ["text", "PRIMARY KEY", "NOT NULL"],
    data: ["text", "NOT NULL"],
  },
  [],
);

createTable(
  "users",
  {
    id: ["text", "PRIMARY KEY", "NOT NULL"],
    username: ["text", "UNIQUE", "NOT NULL"],
    passwordHash: ["text", "NOT NULL"],
  },
  [],
);

export interface List {
  id: string;
  status: "todo" | "inprogress" | "done";
  date: Date;
}

export function getLists(): List[] {
  const rows = db.queryEntries<{ id: string; status: string; date: string }>(
    "SELECT id, status, date FROM lists order by date desc",
  );
  return rows.map((row) => {
    return {
      ...row,
      status: ["todo", "inprogress", "done"].includes(row.status)
        ? row.status as "todo" | "inprogress" | "done"
        : "todo",
      date: new Date(row.date),
    };
  });
}

export function getList(listId: string): List | undefined {
  const rows = db.queryEntries<{ id: string; status: string; date: string }>(
    "SELECT id, status, date FROM lists WHERE id = ?",
    [listId],
  );
  return rows.map((row) => {
    return {
      ...row,
      status: ["todo", "inprogress", "done"].includes(row.status)
        ? row.status as "todo" | "inprogress" | "done"
        : "todo",
      date: new Date(row.date),
    };
  }).at(0);
}

export function createList(
  date: Date = new Date(),
  status: "todo" | "inprogress" | "done" = "todo",
) {
  const id = crypto.randomUUID();
  const row = db.query(
    "INSERT INTO lists (id, date, status) VALUES (?, ?, ?)",
    [
      id,
      date,
      status,
    ],
  );
  Log.info(row);
  return id;
}

export interface Item {
  id: string;
  text: string;
  checked: boolean;
  list: string;
  parent: string;
  sortFractions: number[];
}

export function getItems(listId?: string): Item[] {
  let rows;
  type entries = {
    id: string;
    text: string;
    checked: number;
    list: string;
    parent: string;
    sortFractions: Uint8Array;
    sort: number;
  };
  if (listId) {
    rows = db.queryEntries<entries>(
      "SELECT id, text, checked, list, parent, sortFractions, sort FROM items WHERE list = ? order by sort asc",
      [listId],
    );
  } else {
    rows = db.queryEntries<entries>(
      "SELECT id, text, checked, list, parent, sortFractions, sort FROM items order by sort asc",
    );
  }
  return rows.map((row) => {
    Log.info(row);
    const numbers = new Uint32Array(row.sortFractions.buffer);
    return {
      ...row,
      checked: !!row.checked,
      sortFractions: [...numbers.values()].map(Number),
    };
  });
}

export function getLastItem(listId: string): Item {
  type entries = {
    id: string;
    text: string;
    checked: number;
    list: string;
    parent: string;
    sortFractions: Uint8Array;
    sort: number;
  };
  const rows = db.queryEntries<entries>(
    "SELECT id, text, checked, list, parent, sortFractions, sort FROM items WHERE list = ? order by sort desc limit 1",
    [listId],
  );
  Log.info(listId, rows);
  return rows.map((row) => {
    const numbers = new Uint32Array(row.sortFractions.buffer);
    return {
      ...row,
      checked: !!row.checked,
      sortFractions: [...numbers.values()].map(Number),
    };
  })[0];
}

export function getItem(itemId: string): Item {
  type entries = {
    id: string;
    text: string;
    checked: number;
    list: string;
    parent: string;
    sortFractions: Uint8Array;
    sort: number;
  };
  const rows = db.queryEntries<entries>(
    "SELECT id, text, checked, list, parent, sortFractions, sort FROM items WHERE id = ? order by sort desc limit 1",
    [itemId],
  );
  return rows.map((row) => {
    const numbers = new Uint32Array(row.sortFractions.buffer);
    return {
      ...row,
      checked: !!row.checked,
      sortFractions: [...numbers.values()].map(Number),
    };
  })[0];
}

export function createItem(
  listId: string,
  text: string,
  sortFractions: [number, number],
  sort: number,
) {
  const id = uuidV4.generate();
  const row = db.query(
    "INSERT INTO items (id, text, list, checked, sortFractions, sort) VALUES (?, ?, ?, ?, ?, ?)",
    [
      id,
      text,
      listId,
      false,
      new Uint8Array(Uint32Array.from(sortFractions).buffer),
      sort,
    ],
  );
  Log.info(row);
  return id;
}

export function updateItemChecked(
  itemId: string,
  checked: boolean,
) {
  type entries = {
    id: string;
    text: string;
    checked: number;
    list: string;
    parent: string;
    sortFractions: Uint8Array;
    sort: number;
  };
  const rows = db.queryEntries<entries>(
    "UPDATE items SET checked = ? WHERE id = ?",
    [checked, itemId],
  );
  Log.info(rows);
  return rows.map((row) => {
    const numbers = new Uint32Array(row.sortFractions.buffer);
    return {
      ...row,
      checked: !!row.checked,
      sortFractions: [...numbers.values()].map(Number),
    };
  })[0];
}

export function updateItemMove(
  itemId: string,
  parentId?: string,
  sortFractions?: number[],
) {
  db.transaction(() => {
    // null is allowed
    if (parentId !== undefined) {
      const result = db.query(
        "UPDATE items SET parent = ? WHERE id = ?",
        [parentId, itemId],
      );
      Log.info("update parent", result);
    }
    if (sortFractions) {
      const result = db.query(
        "UPDATE items SET sortFractions = ?, sort = ? WHERE id = ?",
        [
          new Uint8Array(Uint32Array.from(sortFractions).buffer),
          sortFractions[0] / sortFractions[1],
          itemId,
        ],
      );
      Log.info("update sort", result);
    }
  });
}

export function updateItem(itemId: string, changes: { text?: string }) {
  db.transaction(() => {
    if (changes.text) {
      const result = db.query(
        "UPDATE items SET text = ? WHERE id = ?",
        [
          changes.text,
          itemId,
        ],
      );
      Log.info(result);
    }
  });
}

export function deleteItem(itemId: string) {
  return db.query("DELETE FROM items WHERE id = ?", [itemId]);
}

export function updateListStatus(listId: string, status: string) {
  const result = db.query("UPDATE lists SET status = ? WHERE id = ?", [
    status,
    listId,
  ]);
  return result;
}

export function sessionExists(id: string) {
  const results = db.queryEntries<{ count: number }>(
    "SELECT COUNT(id) as count FROM sessions WHERE id = ?",
    [id],
  );
  Log.info(["sessionExists ", results]);
  return results.at(0)?.count === 1;
}

export function getSessionById(id: string) {
  const results = db.queryEntries<{ id: string; data: string }>(
    "SELECT id, data FROM sessions WHERE id = ?",
    [id],
  );
  return results.at(0);
}

export function createSession(id: string, data: string) {
  const result = db.query("INSERT INTO sessions (id, data) VALUES (?, ?)", [
    id,
    data,
  ]);
  return result;
}

export function updateSession(id: string, data: string) {
  const result = db.query("UPDATE sessions SET data = ? WHERE id = ?", [
    data,
    id,
  ]);
  return result;
}

export function getUserByUsername(username: string) {
  const results = db.queryEntries<
    { id: string; username: string; passwordHash: string }
  >(
    "SELECT id, username, passwordHash FROM users WHERE username = ?",
    [username],
  );
  return results.at(0);
}
