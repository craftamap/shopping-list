import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { BaseRepository } from "./BaseRepository.ts";

export interface PersistedSession {
  id: string;
  expiresAt: string;
  data: string;
}

export class SessionsRepository extends BaseRepository<PersistedSession> {
  constructor(db: DB) {
    super(db, "sessions");
  }

  initialize(): void {
    this.createTable(
      {
        id: ["text", "PRIMARY KEY", "NOT NULL"],
        data: ["text", "NOT NULL"],
      },
      [],
    );
    this.addColumn(["expiresAt", [
      "text",
      "NOT NULL",
      'DEFAULT ""',
    ]]);
  }

  exists(id: string) {
    const results = this.db.queryEntries<{ count: number }>(
      "SELECT COUNT(id) as count FROM sessions WHERE id = ?",
      [id],
    );
    return results.at(0)?.count === 1;
  }

  get(id: string) {
    const results = this.db.queryEntries<
      { id: string; expiresAt: string; data: string }
    >(
      "SELECT id, data FROM sessions WHERE id = ?",
      [id],
    );
    return results.at(0);
  }

  create({ id, data }: PersistedSession) {
    const result = this.db.query(
      "INSERT INTO sessions (id, data) VALUES (?, ?)",
      [
        id,
        data,
      ],
    );
    return result;
  }

  updateSession({ id, data }: PersistedSession) {
    const result = this.db.query("UPDATE sessions SET data = ? WHERE id = ?", [
      data,
      id,
    ]);
    return result;
  }
}
