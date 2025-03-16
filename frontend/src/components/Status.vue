<script setup lang="ts">
import { ListStatus, useListsStore } from '../stores/lists';

const { list } = defineProps<{
    list: any
}>();

const listsStore = useListsStore()
const updateStatus = (id: string, currentStatus: string) => {
    let newStatus: ListStatus = 'todo';
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
</script>

<template>
        <button class="status" :data-status="list.status" @click="updateStatus(list.id, list.status)">{{list.status.toUpperCase()}}</button> 
</template>


<style scoped>
.status {
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: normal;
    cursor: pointer;

    padding: 0.25em;
    margin: 0.25em 0em;
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
