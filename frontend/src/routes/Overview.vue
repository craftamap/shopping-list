<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { useListsStore } from '../stores/lists.ts' 
import Header from '../components/Header.vue'
import { computed } from 'vue';
import Status from '../components/Status.vue';

const router = useRouter()
const listsStore = useListsStore()
listsStore.fetchAll()

const lists = computed(() => listsStore.sortedLists)
const create = async () => {
    const id = await listsStore.create()
    router.push(`/list/${id}`)
}
</script>

<template>
    <Header>
        Overview
        <template v-slot:action-right>
            <button class="create" @click="create">+</button>
        </template>
    </Header>
    <div class="list" v-for="list in lists" :data-id="list.id" >
        <router-link :to="`/list/${list.id}`">{{ new Date(list.date).toLocaleString() }}</router-link>
        <Status :list="list" />
    </div>
</template>

<style scoped>
a {
    color: inherit;
    text-decoration: inherit;
}

.list {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: 0.5em;
    margin-right: 0.5em;
    border-bottom: 0.5px solid #aaaaaa;
}

.create {
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: normal;
    cursor: pointer;
}
</style>
