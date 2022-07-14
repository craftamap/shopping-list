import * as db from "../db/index.ts";
import { ListItem } from "../islands/ShoppingList.tsx";
import { eventHub } from "./hub.ts";

class ListService {
  getLists() {
    return db.getLists()
  }

  getItems(id: string) {
    const items = db.getItems(id);
    console.log("getItems from db", items);

    const finalItems = [];
    const itemMap = new Map<string, db.Item & ListItem>();
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
    const item = db.getLastItem(listId);
    const [numerator, denominator] = item.sortFractions;

    // to find the next slot, "add" 1/0
    const newId = db.createItem(
      listId,
      text,
      [numerator + 1, denominator],
      numerator + 1 / denominator,
    );

    eventHub.sendToClients(JSON.stringify({ type: "putItem", id: newId }));
    return newId;
  }

  putItemChecked(itemId: string, checked: boolean) {
    db.updateItemChecked(itemId, checked);
    eventHub.sendToClients(
      JSON.stringify({ type: "putItemChecked", id: itemId }),
    );
  }

  updateItem(itemId: string, changes: { text: string }) {
    db.updateItem(itemId, changes);
    eventHub.sendToClients(
      JSON.stringify({ type: "updateItem", id: itemId }),
    );
  }

  deleteItem(itemId: string) {
    // unwrap or delete all children?
    const item = db.getItem(itemId);
    db.getItems(item.list).filter((i) => i.parent === item.id).forEach((i) => {
      this.moveItem(i.id, { after: item.id });
    });
    db.deleteItem(item.id);
    eventHub.sendToClients(
      JSON.stringify({ type: "deleteItem", id: itemId }),
    );
  }
  moveItem(itemId: string, moveOperation: MoveOperation) {
    console.log("moveOperation", moveOperation);
    const item = db.getItem(itemId);
    const listId = item.list;
    const listItems = db.getItems(listId);

    let after: db.Item | undefined;
    let before: db.Item | undefined;
    if (moveOperation.after) {
      console.log(listItems);
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
    }
    console.log("after is", after);
    console.log("before is", before);

    if (moveOperation.parent && moveOperation.parent !== item.id) {
      item.parent = moveOperation.parent;
    } else if (after && after.parent !== item?.parent) {
      item.parent = after?.parent;
    }

    item.sortFractions = [
      (after?.sortFractions[0] || 0) + (before?.sortFractions[0] || 1),
      (after?.sortFractions[1] || 1) + (before?.sortFractions[1] || 0),
    ];
    console.log("updateItemMove with ", item);
    db.updateItemMove(item.id, item.parent, item.sortFractions);
    eventHub.sendToClients(JSON.stringify({ type: "moveItem", id: itemId }));
  }
}

export interface MoveOperation {
  parent?: string; // id of new parent
  after?: string; // move it after item with id
}

export const listService = new ListService();
