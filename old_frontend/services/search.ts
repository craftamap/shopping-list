import {
  create,
  insert,
  insertBatch,
  Lyra,
  PropertiesSchema,
  remove,
  search,
} from "https://esm.sh/@lyrasearch/lyra@0.4.9";
import { Item } from "../db/ItemsRepository.ts";
import { listService } from "./list-service.ts";

interface ItemIndexSchema extends PropertiesSchema {
  text: "string";
  itemId: "string";
}

class SearchService {
  #itemIndex: Lyra<ItemIndexSchema>;

  static async create() {
    const itemIndex = await create({
      schema: {
        text: "string",
        itemId: "string",
      },
      defaultLanguage: "german",
    });
    return new SearchService(itemIndex);
  }

  private constructor(itemIndex: Lyra<ItemIndexSchema>) {
    this.#itemIndex = itemIndex;
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

  async addEntry(item: Item) {
    console.debug(`adding item ${item.id} to search index`);
    await insert(this.#itemIndex, {
      text: item.text,
      itemId: item.id,
    });
  }

  async updateEntry(item: Item) {
    console.debug(`updating item ${item.id} in search index`);
    try {
      await this.removeEntry(item);
      await this.addEntry(item);
    } catch (e) {
      console.log(`failed to update entry`, e);
    }
  }

  async removeEntry(item: Item | { id: string }) {
    console.debug(`removing item ${item.id} from search index`);
    const searchResults = await search(this.#itemIndex, {
      term: item.id,
      properties: ["itemId"],
    });
    const matchingSearchResult = searchResults.hits.find((r) => {
      return r.document.itemId === item.id;
    });

    if (!matchingSearchResult) {
      throw new Error(
        `failed to remove item ${item.id}, couldnt find it in index`,
      );
    }

    remove(this.#itemIndex, matchingSearchResult.id);
  }

  async search(term: string) {
    return await search(this.#itemIndex, {
      term,
      properties: ["text"],
    });
  }
}

export const searchService = await SearchService.create();
