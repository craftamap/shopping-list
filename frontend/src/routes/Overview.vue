<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useListsStore } from '../stores/lists.ts' 
import { computed } from 'vue';

const listsStore = useListsStore()
listsStore.fetchAll()

const lists = computed(() => listsStore.sortedLists)
</script>

<template>
    <div class="list" v-for="list in lists" :data-id="list.id" >
        <router-link :to="`/list/${list.id}`">{{ new Date(list.date).toLocaleString() }}</router-link>
        <button>{{list.status}}</button> 
    </div>
</template>

<style scoped>
.list {
    display: flex;
    justify-content: space-between;
}
</style>
