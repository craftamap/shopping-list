import { Item } from "../db/ItemsRepository.ts";
import { ListItem } from "../islands/ShoppingList.tsx";

export function treeifyItems(items: Item[]): ListItem[] {
  const finalItems = [];
  const itemMap = new Map<string, Item & ListItem>();
  // NOTE: structuredClone is a fairly new API that allows a deep copy of the provided data.
  for (const item of structuredClone(items) as Item[]) {
    itemMap.set(item.id, item);
  }

  for (const item of itemMap.values()) {
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
  return finalItems;
}
