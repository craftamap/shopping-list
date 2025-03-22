<script setup lang="ts">
    
</script>

<template>
    <div class="header">
        <div class="inner">
            <div class="action-left"><slot name="action-left"></slot></div>
            <div class="header-text"><slot /></div>
            <div class="action-right"><slot name="action-right"></slot></div>
        </div>
    </div>
</template>

<style>
.header {
    width: 100%;
    padding: 1em;
    margin-bottom: 1em;

    box-shadow: 0px 5px 10px 0px rgba(0,0,0,0.30);

    .header-text {
        font-size: larger;
        font-weight: bold;
        flex-grow: 1;
    }

    .action-left:not(:empty) {
        margin-right: 4px;

        /* Not sure if this correct to style this here, since the a tag is coming from the outside? */
        a {
            color: inherit;
            text-decoration: inherit;
        }
    }
    .action-right:not(:empty) {
        margin-left: 4px;

        /* Not sure if this correct to style this here, since the a tag is coming from the outside? */
        a {
            color: inherit;
            text-decoration: inherit;
        }
    }
}

.header .inner {
    display: flex;
    align-items: center;

    max-width: 800px;
    margin: 0 auto;
}
</style>
