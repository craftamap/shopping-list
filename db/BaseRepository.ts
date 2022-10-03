import { DB } from "https://deno.land/x/sqlite/mod.ts";

export abstract class BaseRepository<T> {
  protected db: DB;
  protected tableName: string;

  constructor(db: DB, name: string) {
    this.db = db;
    this.tableName = name;

    this.initialize();
  }

  tableExists(): boolean {
    const rows = this.db.query(
      `SELECT name FROM sqlite_master WHERE type='table' and name=?`,
      [this.tableName],
    );
    return (rows.length > 0);
  }

  createTable(
    columns: Record<string, string[]>,
    foreignKeys: [string, string][],
    options?: { drop?: boolean },
  ) {
    const exists = this.tableExists();
    if (exists && !options?.drop) {
      console.log(`table ${this.tableName} already exists; skipping creation`);
      return;
    } else if (exists) {
      this.db.execute(`DROP table ${this.tableName};`);
    }

    const columnDeclarations = Object.entries(columns).map(([key, value]) =>
      `${key} ${value.join(" ")}`
    ).join(",\n");

    const foreignKeysDeclarations = foreignKeys.map(([key, target]) =>
      `, FOREIGN KEY (${key}) REFERENCES ${target}`
    ).join(" ");

    const query =
      `CREATE TABLE ${this.tableName} (${columnDeclarations} ${foreignKeysDeclarations});`;
    console.log(query);

    this.db.execute(
      query,
    );
  }

  abstract initialize(): void;
}
