import { onMounted, ref } from "vue";
import { useListsStore } from "./stores/lists";
import { useItemsStore } from "./stores/items";

export function useWebSocket() {
    const ws = ref<WebSocket | null>(null);
    const listsStore = useListsStore()
    const itemsStore = useItemsStore()

    const connect = () => {
        ws.value = new WebSocket("ws://localhost:3333/api/events/")
        ws.value.addEventListener('open', () => {
            console.log("WebSocket connected.");
        })

        ws.value.addEventListener('error', (err) => {
            console.log("WebSocket error", err);
        })

        ws.value.addEventListener('message', (event) => {
            console.log(event)
            const data = JSON.parse(event.data)

            switch (data.type) {
                case "LIST_CREATED":
                case "LIST_UPDATED":
                    listsStore.fetch(data.listID)
                    break
                case "ITEMS_IN_LIST_CHANGED":
                    itemsStore.fetch(data.listID)
            }
        })
    }


    onMounted(() => {
        connect()
    })
}
