import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { BaseRepository } from "./BaseRepository.ts";

export interface Item {
  id: string;
  text: string;
  checked: boolean;
  list: string;
  parent: string;
  sort: number;
  sortFractions: number[];
}

export class ItemsRepository extends BaseRepository<Item> {
  constructor(db: DB) {
    super(db, "items");
  }

  initialize(): void {
    this.createTable(
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
  }

  getAllByListId(listId?: string): Item[] {
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
      rows = this.db.queryEntries<entries>(
        "SELECT id, text, checked, list, parent, sortFractions, sort FROM items WHERE list = ? order by sort asc",
        [listId],
      );
    } else {
      rows = this.db.queryEntries<entries>(
        "SELECT id, text, checked, list, parent, sortFractions, sort FROM items order by sort asc",
      );
    }
    return rows.map((row) => {
      console.log(row);
      const numbers = new Uint32Array(row.sortFractions.buffer);
      return {
        ...row,
        checked: !!row.checked,
        sortFractions: [...numbers.values()].map(Number),
      };
    });
  }

  getLastByListId(listId: string): Item | null {
    type entries = {
      id: string;
      text: string;
      checked: number;
      list: string;
      parent: string;
      sortFractions: Uint8Array;
      sort: number;
    };
    const rows = this.db.queryEntries<entries>(
      "SELECT id, text, checked, list, parent, sortFractions, sort FROM items WHERE list = ? order by sort desc limit 1",
      [listId],
    );
    console.log(listId, rows);
    return rows.map((row) => {
      const numbers = new Uint32Array(row.sortFractions.buffer);
      return {
        ...row,
        checked: !!row.checked,
        sortFractions: [...numbers.values()].map(Number),
      };
    }).at(0) || null;
  }

  get(itemId: string): Item | null {
    type entries = {
      id: string;
      text: string;
      checked: number;
      list: string;
      parent: string;
      sortFractions: Uint8Array;
      sort: number;
    };
    const rows = this.db.queryEntries<entries>(
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
    }).at(0) || null;
  }

  create(
    listId: string,
    text: string,
    sortFractions: [number, number],
    sort: number,
  ) {
    const id = globalThis.crypto.randomUUID();
    const row = this.db.query(
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
    console.log(row);
    return id;
  }

  updateChecked(
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
    const rows = this.db.queryEntries<entries>(
      "UPDATE items SET checked = ? WHERE id = ?",
      [checked, itemId],
    );
    console.log(rows);
    return rows.map((row) => {
      const numbers = new Uint32Array(row.sortFractions.buffer);
      return {
        ...row,
        checked: !!row.checked,
        sortFractions: [...numbers.values()].map(Number),
      };
    })[0];
  }

  move(
    itemId: string,
    parentId?: string,
    sortFractions?: number[],
  ) {
    this.db.transaction(() => {
      // null is allowed
      if (parentId !== undefined) {
        const result = this.db.query(
          "UPDATE items SET parent = ? WHERE id = ?",
          [parentId, itemId],
        );
        console.log("update parent", result);
      }
      if (sortFractions) {
        const result = this.db.query(
          "UPDATE items SET sortFractions = ?, sort = ? WHERE id = ?",
          [
            new Uint8Array(Uint32Array.from(sortFractions).buffer),
            sortFractions[0] / sortFractions[1],
            itemId,
          ],
        );
        console.log("update sort", result);
      }
    });
  }

  update(itemId: string, changes: { text?: string }) {
    this.db.transaction(() => {
      if (changes.text) {
        const result = this.db.query(
          "UPDATE items SET text = ? WHERE id = ?",
          [
            changes.text,
            itemId,
          ],
        );
        console.log(result);
      }
    });
  }

  delete(itemId: string) {
    return this.db.query("DELETE FROM items WHERE id = ?", [itemId]);
  }
}
