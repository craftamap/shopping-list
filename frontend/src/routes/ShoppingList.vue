<script setup lang="ts">
import { useRoute } from 'vue-router';
import Header from '../components/Header.vue'
import { RouterLink } from 'vue-router';
import ShoppingListItem from '../components/ShoppingListItem.vue'
import { useItemsStore } from '../stores/items.ts'
import { useListsStore } from '../stores/lists';
import { computed } from 'vue';
import Status from '../components/Status.vue';

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
            if (!!parent) {
                parent.children.push(node);
            }
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
    <Header>
        <template v-slot:action-left>
            <router-link to="/list">&#x276e;</router-link>
        </template>
        {{new Date(list?.date).toLocaleString()}}
        <template v-slot:action-right v-if="list">
            <Status :list="list"/>
        </template>
    </Header>
    <main>
        <ShoppingListItem v-for="item of items" :node="item" />
        <input class="newItem" type="text" enterkeyhint="enter" v-model="createInput" @keyup.enter="create" />
    </main>
</template>

<style>
.newItem {
    width: 100%;
}

main {
    max-width: 800px;
    margin: 0 auto;
}
</style>
