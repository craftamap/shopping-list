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

const listId = route.params.id as string;

listsStore.ensureFetched(listId);
itemsStore.fetch(listId);

const items = computed(
    () => {
        const i = itemsStore.getItemsByList(listId)
        if (!i) {
            return []
        }

        return buildItemTree(i)
    }
);
const list = computed(() => listsStore.lists[listId]);

const createInput = defineModel<string>()
const create = () => {
    console.log(createInput)
    if (createInput.value) {
        itemsStore.create(listId, createInput.value || '')
        createInput.value = ''
    }
}

</script>

<template>
    <h1>{{list?.date}}</h1>
    <ShoppingListItem v-for="item of items" :node="item" />
    <input class="newItem" type="text" enterkeyhint="enter" v-model="createInput" @keyup.enter="create" />
</template>

<style>
.newItem {
    width: 100%;
}
</style>
