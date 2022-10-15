import {
  create,
  insert,
  insertBatch,
  Lyra,
  PropertiesSchema,
  remove,
  search,
} from "https://esm.sh/@lyrasearch/lyra@0.2.6";
import { Item } from "../db/ItemsRepository.ts";
import { listService } from "./list-service.ts";

interface ItemIndexSchema extends PropertiesSchema {
  text: "string";
  itemId: "string";
}

class SearchService {
  #itemIndex: Lyra<ItemIndexSchema>;

  constructor() {
    this.#itemIndex = create({
      schema: {
        text: "string",
        itemId: "string",
      },
      defaultLanguage: "german",
    });
  }

  async initalize() {
    const listItems = listService.getLists().flatMap((list) =>
      listService.getItems(list.id)
    );
    await insertBatch(
      this.#itemIndex,
      listItems.map((item) => {
        return {
          text: item.text,
          itemId: item.id,
        };
      }),
    );
  }

  addEntry(item: Item) {
    console.debug(`adding item ${item.id} to search index`);
    insert(this.#itemIndex, {
      text: item.text,
      itemId: item.id,
    });
  }

  updateEntry(item: Item) {
    console.debug(`updating item ${item.id} in search index`);
    try {
      this.removeEntry(item);
      this.addEntry(item);
    } catch (e) {
      console.log(e);
    }
  }

  removeEntry(item: Item | { id: string }) {
    console.debug(`removing item ${item.id} from search index`);
    const searchResults = search(this.#itemIndex, {
      term: item.id,
      properties: ["itemId"],
    });
    const matchingSearchResult = searchResults.hits.find((r) => {
      return r.itemId === item.id;
    });

    if (!matchingSearchResult) {
      throw new Error(
        `failed to remove item ${item.id}, could find it in index`,
      );
    }

    remove(this.#itemIndex, matchingSearchResult.id);
  }

  search(term: string) {
    return search(this.#itemIndex, {
      term,
      properties: ["text"],
    });
  }
}

export const searchService = new SearchService();
