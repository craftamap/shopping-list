# shopping-list

`shopping-list` is my personal shopping-list application. For each shopping trip, a list can be created. A list can be in a status (todo, in progress, done). Each list supports nested items - this allows to group items, for example by recipe. Grouping works by drag-and-drop, or by clicking on the tree dots next to a item, and then where to drop it.

## Development

### Architecture

The backend is a simple go backend, using go's built-in router. As a database, sqlite is used, using go-sqlite3.

The frontend is built using Vue.js, vue-router and pinia.

The frontend communicates with the backend via a simple HTTP + JSON API. Additionally, events are sent from the backend to the frontend via websockets - this is used to allow multiple clients to edit the same shopping list.


### Getting started

Install the required dependencies by running

```sh
(cd frontend && yarn install)
go get
```

Then the project can be build using 

```sh
just build
```
