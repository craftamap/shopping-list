<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useWebSocket } from './ws';
useWebSocket()
</script>

<template>
    <RouterView/>
</template>

<style scoped>
</style>
