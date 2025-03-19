<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    text: string,
}>();

const instructions = computed(() => {
    const splitted = props.text.split(/(\s+)/)
    const result: any = []
    for (const item of splitted) {
        if (item.startsWith('https:\/\/')) {
            result.push({
                type: 'link',
                href: item,
            })
        } else {
            result.push({
                type: 'text',
                text: item,
            })
        }
    }

    return result
}) 
</script>

<template>
    <template v-for="instruction in instructions">
        <a v-if="instruction.type === 'link'" :href="instruction.href">{{instruction.href}}</a>
        <span v-if="instruction.type === 'text'">{{instruction.text}}</span>
    </template>
</template>
