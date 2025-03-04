<script setup lang="ts">
import { computed, onMounted, ref, toRefs, useTemplateRef } from 'vue';
import { useItemsStore } from '../stores/items';
import { useListsStore } from '../stores/lists';

const props = defineProps<{
    node: any,
    depth?: number;
}>();
const { node, depth } = toRefs(props)
const item = computed(() => node.value[1].item);
const itemsStore = useItemsStore();
const listsStore = useListsStore();

const changeChecked = (foo: any) => {
    console.log(item.value.checked, foo)
    itemsStore.update(item.value.list, item.value.id, { checked: foo.currentTarget.checked })
}

const moveAfter = async (draggedItemId: string) => {
    console.log(item)
    await itemsStore.moveAfter(item.value.list, draggedItemId, item.value.id)
}

const moveNested = async (draggedItemId: string) => {
    console.log(item)
    await itemsStore.moveNested(item.value.list, draggedItemId, item.value.id)
}


const onDragStart = (ev: DragEvent) => {
    console.log(ev.target)
    ev.dataTransfer?.setData("application/json", JSON.stringify(item.value.id))
}

const draggingOverAfter = ref(false);

const onDragEnterAfter = (ev: DragEvent) => {
    ev.preventDefault(); // marks an area as droppable
    draggingOverAfter.value = true;
}

const onDragOverAfter = (ev: DragEvent) => {
    ev.preventDefault(); // marks an area as droppable
    draggingOverAfter.value = true;
}
const onDragLeaveAfter = (_ev: DragEvent) => {
    draggingOverAfter.value = false;
}
const onDropAfter = (ev: DragEvent) => {
    ev.preventDefault(); // marks an area as droppable
    const data = JSON.parse(ev.dataTransfer?.getData("application/json") || '')
    console.log("transferred item", data, "target", item.value.id)
    moveAfter(data)

    draggingOverAfter.value = false;
    draggingOverNested.value = false;
}


const draggingOverNested = ref(false);

const onDragEnterNested = (ev: DragEvent) => {
    ev.preventDefault(); // marks an area as droppable
    draggingOverNested.value = true;
}

const onDragOverNested = (ev: DragEvent) => {
    ev.preventDefault(); // marks an area as droppable
    draggingOverNested.value = true;
}
const onDragLeaveNested = (_ev: DragEvent) => {
    draggingOverNested.value = false;
}
const onDropNested = (ev: DragEvent) => {
    ev.preventDefault(); // marks an area as droppable
    const data = JSON.parse(ev.dataTransfer?.getData("application/json") || '')
    console.log("transferred item", data, "target", item.value.id)
    moveNested(data)

    draggingOverAfter.value = false;
    draggingOverNested.value = false;
}

const asInput = ref(false)
const input = useTemplateRef('text-input')
const onClickText = () => {
    asInput.value = true;
    requestAnimationFrame(() => {
        input.value?.focus();
    })
}
const editInputModel = defineModel<string>()
editInputModel.value = item.value.text

const update = async () => {
    itemsStore.update(item.value.list, item.value.id, { text: editInputModel.value })
    input.value?.blur()

    await itemsStore.create(item.value.list, '', item.value.id);
}

const deleteItem = () => {
    itemsStore.delete(item.value.list, item.value.id)
}


onMounted(() => {
    if(item.value.text === '') {
        asInput.value = true;
        requestAnimationFrame(() => {
            input.value?.focus();
        })
    }
})

const itemToMove = computed(() => listsStore.getItemToMove(item.value.list))

const setItemToMove = () => {
    if(itemToMove.value !== item.value.id) {
        listsStore.setItemToMove(item.value.list, item.value.id)
    } else {
        listsStore.setItemToMove(item.value.list, undefined)
    }
}


const moveItemToMoveAfter = () => {
    if (itemToMove.value) {
        moveAfter(itemToMove.value)
        listsStore.setItemToMove(item.value.list, undefined)
    }
}
const moveItemToMoveNested = () => {
    if (itemToMove.value) {
        moveNested(itemToMove.value!)
        listsStore.setItemToMove(item.value.list, undefined)
    }
}
</script>

<template>
    <div class="item" :style="`padding-left: ${(depth || 0) * 8}px`" :data-id="item.id" :data-sort="item.sort" draggable="true"
        @dragstart="onDragStart">
        <div class="textarea">
            <span @click="setItemToMove">⋮</span><input type="checkbox" :checked="item.checked" @change="changeChecked" />
            <span class="text" v-if="!asInput" @click="onClickText">{{ item.text }}</span>
            <input class="text" v-if="asInput" @blur="asInput = false" ref="text-input" v-model="editInputModel" enterkeyhint="enter" @keyup.enter="update" />
            <button class="delete" @click="deleteItem">&#x1F5D1;</button>
        </div>
        <div class="droparea">
            <div class="after" :class="draggingOverAfter || itemToMove ? 'visible' : ''" @dragenter="onDragEnterAfter" @dragover="onDragOverAfter"
                @dragleave="onDragLeaveAfter" @drop="onDropAfter" @click="moveItemToMoveAfter"></div>
            <div class="nested" :class="draggingOverNested || itemToMove ? 'visible' : ''" @dragenter="onDragEnterNested"
                @dragover="onDragOverNested" @dragleave="onDragLeaveNested" @drop="onDropNested" @click="moveItemToMoveNested"></div>
        </div>
    </div>
    <ShoppingListItem v-for="child of node[1].children" :node="child" :depth="(depth || 0) + 1" />
</template>

<style>
.item {
    margin-left: 8px;
}

.textarea {
    display: flex;
    align-items: center;

    .text {
        flex-grow: 1;
    }

    button {
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        line-height: normal;
        cursor: pointer;
    }
}


.droparea {
    font-size: xx-small;

    >div {
        display: inline-block;
        opacity: 0;

    }

    .after {
        background: lightgray;
        width: calc(10% - 8px); 
        margin-right: 8px;
        height: 0.5em;
    }

    .nested {
        background: gray;
        width: 90%;
        height: 0.5em;
    }

    .visible {
        opacity: 1;
    }
}
</style>
