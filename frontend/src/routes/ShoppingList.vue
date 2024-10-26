<script setup lang="ts">
import { useRoute } from 'vue-router';
import ShoppingListItem from './ShoppingListItem.vue'
import { useItemsStore } from '../stores/items.ts'
import { useListsStore } from '../stores/lists';
import { computed } from 'vue';

const buildItemTree = (items: any) => {
    const allNodes: Record<string, any> = {};
    for (const item of items) {
        allNodes[item.id] = { item, children: [] }
    }

    const rootNodes = [];
    for (const node of Object.entries(allNodes)) {
        const item = node[1].item;
        if (!item.parent) {
            rootNodes.push(node)
        } else {
            const parent = allNodes[item.parent];
            parent.children.push(node);
        }
    }
    return rootNodes
};

const route = useRoute()
const itemsStore = useItemsStore();
const listsStore = useListsStore();

const id = route.params.id as string;

listsStore.ensureFetched(id);
itemsStore.fetch(id);

const items = computed(
    () => {
        const i = itemsStore.getItemsByList(id)
        if (!i) {
            return []
        }

        return buildItemTree(i)
    }
);
const list = computed(() => listsStore.lists[id]);
</script>

<template>
    <h1>{{list?.date}}</h1>
    <div v-for="item of items">
        <ShoppingListItem :node="item" />
    </div>
</template>
