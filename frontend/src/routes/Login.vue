<script setup lang="ts">
</script>

<template>
    <form method="POST" action="/login">
        <div>
            <label for="username">Username:</label>
            <input type="text" name="username" id="username" />
        </div>
        <div>
            <label for="password">Password:</label>
            <input type="password" name="password" id="password" />
        </div>
        <input type="submit" value="Login" />

    </form>
</template>
