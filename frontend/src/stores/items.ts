import { defineStore } from "pinia";

export const useItemsStore = defineStore('items', {
    state: () => ({
        itemsByList: {} as Record<string, any>,
    }),
    getters: {
        getItemsByList: (state) => ((id: string) => { console.log('a'); return state.itemsByList[id] })
    },
    actions: {
        async fetch(id: string) {
            const response = await fetch(`/api/list/${id}/item`)
            if (!response.ok) {
                // TODO: proper error handling - fine for now.
                return
            }
            const json = await response.json()
            this.itemsByList = {
                ...this.itemsByList,
                [id]: json,
            }
        },
        async update(listId: string, itemId: string, checked: boolean) {
            await fetch(`/api/list/${listId}/item/${itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    checked: checked,
                }),
            });
            this.fetch(itemId);
        },
        async moveAfter(listId: string, itemId: string, afterId: string) {
            await fetch(`/api/list/${listId}/item/${itemId}/move`, {
                method: 'POST',
                body: JSON.stringify({
                    afterId,
                }),
            });
            this.fetch(itemId);
        },
        async moveNested(listId: string, itemId: string, parentId: string) {
            await fetch(`/api/list/${listId}/item/${itemId}/move`, {
                method: 'POST',
                body: JSON.stringify({
                    parentId,
                }),
            });
            this.fetch(itemId);
        }
    }
})
