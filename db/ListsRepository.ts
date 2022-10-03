import { DB } from "https://deno.land/x/sqlite/mod.ts";

import { BaseRepository } from "./BaseRepository.ts";

export interface List {
  id: string;
  status: "todo" | "inprogress" | "done";
  date: Date;
}

export class ListsRepository extends BaseRepository<List> {
  constructor(db: DB) {
    super(db, "lists");
  }

  initialize(): void {
    this.createTable({
      id: ["text", "PRIMARY KEY", "NOT NULL"],
      status: ["text", "NOT NULL", 'DEFAULT "todo"'],
      date: ["text", "NOT NULL"],
    }, []);
  }

  getAll(): List[] {
    const rows = this.db.queryEntries<
      { id: string; status: string; date: string }
    >(
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

  get(listId: string): List | null {
    const rows = this.db.queryEntries<
      { id: string; status: string; date: string }
    >(
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
    }).at(0) || null;
  }

  updateStatus(listId: string, status: string) {
    const result = this.db.query("UPDATE lists SET status = ? WHERE id = ?", [
      status,
      listId,
    ]);
    return result;
  }

  create(
    date: Date = new Date(),
    status: "todo" | "inprogress" | "done" = "todo",
  ) {
    const id = crypto.randomUUID();
    this.db.query(
      "INSERT INTO lists (id, date, status) VALUES (?, ?, ?)",
      [
        id,
        date,
        status,
      ],
    );
    return id;
  }
}
