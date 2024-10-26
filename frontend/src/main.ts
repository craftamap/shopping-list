import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import Overview from './routes/Overview.vue'
import ShoppingList from './routes/ShoppingList.vue'
import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import { createPinia } from 'pinia'

const routes: RouteRecordRaw[] = [
    {
        path: '/', 
        redirect: '/list'
    }, 
    {
        path: '/list',
        component: Overview,
    },
    {
        path: '/list/:id',
        component: ShoppingList,
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes: routes,
})

const pinia = createPinia()

createApp(App)
    .use(router)
    .use(pinia)
    .mount('#app')
