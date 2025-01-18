<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { ListStatus, useListsStore } from '../stores/lists.ts' 
import Header from '../components/Header.vue'
import { computed } from 'vue';

const router = useRouter()
const listsStore = useListsStore()
listsStore.fetchAll()

const lists = computed(() => listsStore.sortedLists)
const updateStatus = (id:string, currentStatus: string) => {
    let newStatus: ListStatus= 'todo';
    if(currentStatus === 'todo') {
        newStatus = 'inprogress';
    } else if (currentStatus === 'inprogress') {
        newStatus = 'done';
    } else if (currentStatus === 'done') {
        newStatus === 'todo';
    } else {
        throw new Error('how');
    }

    listsStore.updateStatus(id, newStatus)
}
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
        <button class="status" :data-status="list.status" @click="updateStatus(list.id, list.status)">{{list.status.toUpperCase()}}</button> 
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
    margin-left: 0.5em;
    margin-right: 0.5em;
}

.create {
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: normal;
    cursor: pointer;
}

.status {
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: normal;
    cursor: pointer;

    padding: 0.25em;
    margin: 0.25em;
    border-radius: 0.25em;

    &[data-status="todo"] {
        color: white;
        background: darkorchid;
    }
    &[data-status="inprogress"] {
        color: white;
        background: orange;
    }
    &[data-status="done"] {
        color: white;
        background: green;
    }
}
</style>
