import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { ListsRepository } from "./ListsRepository.ts";
import { UsersRepository } from "./UsersRepository.ts";
import { SessionsRepository } from "./SessionsRepository.ts";
import { ItemsRepository } from "./ItemsRepository.ts";

const db = new DB("db.sqlite");

export const listsRepository = new ListsRepository(db);
export const itemsRepository = new ItemsRepository(db);
export const sessionsRepository = new SessionsRepository(db);
export const usersRepository = new UsersRepository(db);
