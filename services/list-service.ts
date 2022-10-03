import { itemsRepository, listsRepository } from "../db/index.ts";
import { Item } from "../db/ItemsRepository.ts";
import { ListItem } from "../islands/ShoppingList.tsx";
import { eventHub } from "./hub.ts";

class ListService {
  getLists() {
    return listsRepository.getAll();
  }

  getList(listId: string) {
    return listsRepository.get(listId);
  }

  updateListStatus(listId: string, status: string) {
    if (!["inprogress", "todo", "done"].includes(status)) {
      throw Error("wupsidaisy");
    }
    listsRepository.updateStatus(listId, status);
    eventHub.sendToClients(JSON.stringify({ type: "updateListStatus" }));
  }

  addList() {
    return listsRepository.create();
  }

  getActiveList() {
    // TODO: realize this in sql -> blocker? can we get the latest list reliable with sqlite?
    return listsRepository.getAll().filter((list) => {
      return list.status !== "done";
    }).sort((listA, listB) => {
      return listB.date.getTime() - listA.date.getTime();
    }).at(0);
  }

  getItems(id: string) {
    const items = itemsRepository.getAllByListId(id);
    console.log("getItems from db", items);

    const finalItems = [];
    const itemMap = new Map<string, Item & ListItem>();
    for (const item of items) {
      itemMap.set(item.id, item);
    }

    for (const item of items) {
      if (item.parent) {
        const parent = itemMap.get(item.parent);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(item);
        }
      } else {
        finalItems.push(item);
      }
    }
    console.log(finalItems);
    return finalItems;
  }

  putItem({ listId, text }: { listId: string; text: string }) {
    console.log(text);
    const item = itemsRepository.getLastByListId(listId);
    const [numerator, denominator] = item?.sortFractions || [0, 1];

    // to find the next slot, "add" 1/0
    const newId = itemsRepository.create(
      listId,
      text,
      [numerator + 1, denominator],
      numerator + 1 / denominator,
    );

    eventHub.sendToClients(JSON.stringify({ type: "putItem", id: newId }));
    return newId;
  }

  putItemChecked(itemId: string, checked: boolean) {
    itemsRepository.updateChecked(itemId, checked);
    eventHub.sendToClients(
      JSON.stringify({ type: "putItemChecked", id: itemId }),
    );
  }

  updateItem(itemId: string, changes: { text: string }) {
    itemsRepository.update(itemId, changes);
    eventHub.sendToClients(
      JSON.stringify({ type: "updateItem", id: itemId }),
    );
  }

  deleteItem(itemId: string) {
    const item = itemsRepository.get(itemId);
    if (!item) {
      throw new Error(`Can't delete item; no item with itemId=${itemId} found`);
    }
    itemsRepository.getAllByListId(item.list).filter((i) =>
      i.parent === item.id
    ).forEach((i) => {
      this.moveItem(i.id, { after: item.id });
    });
    itemsRepository.delete(item.id);
    eventHub.sendToClients(
      JSON.stringify({ type: "deleteItem", id: itemId }),
    );
  }
  moveItem(itemId: string, moveOperation: MoveOperation) {
    console.log("moveOperation", moveOperation);
    const item = itemsRepository.get(itemId);
    if (!item) {
      throw new Error(`Can't move item; no item with itemId=${itemId} found`);
    }
    const listId = item.list;
    const listItems = itemsRepository.getAllByListId(listId);

    let after: Item | undefined;
    let before: Item | undefined;
    let parent: string | undefined = item.parent;
    if (moveOperation.after) {
      listItems.filter((listItem) => listItem.parent === item.parent)
        .forEach((listItem, idx, listItems) => {
          if (listItem.id === moveOperation.after) {
            after = listItem;
            before = listItems[idx + 1];
          }
        });
      after = listItems.find((listItem) => {
        return listItem.id === moveOperation.after;
      });
      const filtered = listItems.filter((listItem) =>
        listItem.parent === after?.parent
      );

      const idx = filtered.findIndex((listItem) => listItem.id === after?.id);
      before = filtered[idx + 1];
      if (before?.id === item.id) {
        before = undefined;
      }
    } else if (moveOperation.parent) {
      // if just a parent is specified, move the item before it's first child
      before = listItems.filter((listItem) =>
        listItem.parent === moveOperation.parent
      )
        .at(0);
    }

    if (moveOperation.parent && moveOperation.parent !== item.id) {
      parent = moveOperation.parent;
    } else if (after && after.parent !== item?.parent) {
      parent = after?.parent;
    }

    item.sortFractions = [
      (after?.sortFractions[0] || 0) + (before?.sortFractions[0] || 1),
      (after?.sortFractions[1] || 1) + (before?.sortFractions[1] || 0),
    ];
    itemsRepository.move(item.id, parent, item.sortFractions);
    eventHub.sendToClients(JSON.stringify({ type: "moveItem", id: itemId }));
  }
}

export interface MoveOperation {
  parent?: string; // id of new parent
  after?: string; // move it after item with id
}

export const listService = new ListService();
