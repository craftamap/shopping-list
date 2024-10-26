import { defineStore } from "pinia";

export const useListsStore = defineStore('lists', {
    state: () => ({
        lists: {} as Record<string, any>,
    }),
    getters: {
        sortedLists: (state) => {
            return Object.values(state.lists).toSorted((a, b) => a.date.localeCompare(b.date)).toReversed()
        }
    },
    actions: {
        async fetchAll() {
            const response = await fetch(`/api/list/`)
            if (!response.ok) {
                // TODO: proper error handling - fine for now.
                return
            }
            const items = await response.json()
            for (const item of items) {
                this.lists[item.id] = item
            }
        },
        async fetch(id: string) {
            const response = await fetch(`/api/list/${id}`)
            if (!response.ok) {
                // TODO: proper error handling - fine for now.
                return
            }
            const item = await response.json()
            this.lists = {
                ...this.lists,
                [item.id]: item
            }
        },
        async ensureFetched(id: string) {
            if (this.lists[id]) {
                return
            }
            this.fetch(id)
        }
    }
})
