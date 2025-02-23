import { createApp, markRaw } from 'vue'
import './reset.css'
import './app.css'
import App from './App.vue'
import Overview from './routes/Overview.vue'
import ShoppingList from './routes/ShoppingList.vue'
import Login from './routes/Login.vue'
import { createRouter, createWebHashHistory, Router, RouteRecordRaw } from 'vue-router'
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
    },
    {
        path: '/login',
        component: Login,
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes: routes,
})


declare module "pinia" {
  export interface PiniaCustomProperties {
    router: Router;
  }
}
const pinia = createPinia()
pinia.use(({store}) => {
    store.router = markRaw(router)
})

createApp(App)
    .use(router)
    .use(pinia)
    .mount('#app')
