import { defineStore } from "pinia";

export const useItemsStore = defineStore('items', {
    state: () => ({
        itemsByList: {} as Record<string, any>,
    }),
    getters: {
        getItemsByList: (state) => ((id: string) => { console.log('a'); return state.itemsByList[id] })
    },
    actions: {
        async fetch(listId: string) {
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
        async create(listId: string, text: string) {
            await fetch(`/api/list/${listId}/item/`, {
                method: 'POST',
                body: JSON.stringify({
                    text,
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
        }
    }
})
