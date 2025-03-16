import { defineStore } from "pinia";

export type ListStatus = 'inprogress' | 'todo' | 'done'

export const useListsStore = defineStore('lists', {
    state: () => ({
        lists: {} as Record<string, any>,
        itemToMove: {} as Record<string, string | undefined>,
    }),
    getters: {
        sortedLists: (state) => {
            return Object.values(state.lists).toSorted((a, b) => a.date.localeCompare(b.date)).toReversed()
        },
        getItemToMove: (state) => {
            return (listId: string) => state.itemToMove[listId]
        }
    },
    actions: {
        async fetchAll() {
            const response = await fetch(`/api/list/`)
            if (!response.ok) {
                if (response.status == 403) {
                    this.router.push('/login')
                }
                // TODO: proper error handling - fine for now.
                return
            }
            const items = await response.json()
            for (const item of items) {
                this.lists[item.id] = item
            }
        },
        async fetch(id: string) {
            const response = await fetch(`/api/list/${id}/`)
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
        },
        async create() {
            const response = await fetch(`/api/list/`, {
                method: 'POST',
            })
            if (!response.ok) {
                // TODO: proper error handling - fine for now.
                return
            }
            const item = await response.json()
            this.lists = {
                ...this.lists,
                [item.id]: item
            }

            return item.id;
        },
        async updateStatus(id: string, status: ListStatus) {
            const response = await fetch(`/api/list/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: status,
                }),
            })

            if (response.ok) {
                return this.fetch(id)
            }
        },
        async setItemToMove(listId: string, itemId: string | undefined) {
            this.itemToMove[listId] = itemId
        }
    }
})
