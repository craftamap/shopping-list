<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { ListStatus, useListsStore } from '../stores/lists.ts' 
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
    <button @click="create">Create</button>
    <div class="list" v-for="list in lists" :data-id="list.id" >
        <router-link :to="`/list/${list.id}`">{{ new Date(list.date).toLocaleString() }}</router-link>
        <button @click="updateStatus(list.id, list.status)">{{list.status}}</button> 
    </div>
</template>

<style scoped>
.list {
    display: flex;
    justify-content: space-between;
}
</style>
