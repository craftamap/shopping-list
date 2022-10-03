import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { BaseRepository } from "./BaseRepository.ts";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

export class UsersRepository extends BaseRepository<User> {
  constructor(db: DB) {
    super(db, "users");
  }

  initialize(): void {
    this.createTable({
      id: ["text", "PRIMARY KEY", "NOT NULL"],
      username: ["text", "UNIQUE", "NOT NULL"],
      passwordHash: ["text", "NOT NULL"],
    }, []);
  }

  getByUsername(username: string): User | null {
    const results = this.db.queryEntries<
      { id: string; username: string; passwordHash: string }
    >(
      "SELECT id, username, passwordHash FROM users WHERE username = ?",
      [username],
    );
    return results.at(0) || null;
  }
}
