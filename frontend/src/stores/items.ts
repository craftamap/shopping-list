import { defineStore } from "pinia";

export interface ShoppingListItem {
    id: string,
    text: string,
    checked: boolean,
    parent: string | null,
    list: string,
    sort: number,
}

export const useItemsStore = defineStore('items', {
    state: () => ({
        itemsByList: {} as Record<string, ShoppingListItem[]>,
        fetchState: {} as Record<string, {
            promise: Promise<void>,
            pending: boolean,
            settled: boolean,
        }>,
    }),
    getters: {
        getItemsByList: (state) => ((id: string) => { return state.itemsByList[id] })
    },
    actions: {
        async fetch(listId: string) {
            const doFetch = async () => {
                const response = await fetch(`/api/list/${listId}/item/`)
                if (!response.ok) {
                    // TODO: proper error handling - fine for now.
                    return
                }
                const json = await response.json()
                this.itemsByList = {
                    ...this.itemsByList,
                    [listId]: json,
                }
            }

            // we want to prevent that we run multiple fetch requests at the same time, if possible. 
            // we therefore keep track of the request promise state, and only fetch if for the list, no current active promise exists.
            if (this.fetchState[listId]?.pending) {
                return this.fetchState[listId]?.promise;
            }

            const promise = doFetch();
            const obj = {
                promise,
                pending: true,
                settled: false,
            };
            this.fetchState[listId] = obj;
            return Promise.allSettled([promise]).then(() => {
                obj.pending = false;
                obj.settled = true;
            })
        },
        async update(listId: string, itemId: string, { checked, text }: { checked?: boolean, text?: string }) {
            await fetch(`/api/list/${listId}/item/${itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    checked: checked,
                    text: text,
                }),
            });
            return this.fetch(listId);
        },
        async create(listId: string, text: string, after?: string) {
            await fetch(`/api/list/${listId}/item/`, {
                method: 'POST',
                body: JSON.stringify({
                    text,
                    after,
                })
            })
            return this.fetch(listId);
        },
        async moveAfter(listId: string, itemId: string, afterId: string) {
            await fetch(`/api/list/${listId}/item/${itemId}/move`, {
                method: 'POST',
                body: JSON.stringify({
                    afterId,
                }),
            });
            return this.fetch(listId);
        },
        async moveNested(listId: string, itemId: string, parentId: string) {
            await fetch(`/api/list/${listId}/item/${itemId}/move`, {
                method: 'POST',
                body: JSON.stringify({
                    parentId,
                }),
            });
            return this.fetch(listId);
        },
        async delete(listId: string, itemId: string) {
            await fetch(`/api/list/${listId}/item/${itemId}`, {
                method: 'DELETE',
            });
            return this.fetch(listId);
        }
    }
})
