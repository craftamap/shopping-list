package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"

	"log/slog"

	"github.com/craftamap/shopping-list/db"
	_ "github.com/mattn/go-sqlite3"
)

func getAllLists(listRepo *db.ListRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lists, err := listRepo.FindAll(r.Context())
		if err != nil {
			http.Error(w, "", 500)
			return
		}
		err = json.NewEncoder(w).Encode(lists)
		if err != nil {
			http.Error(w, "", 500)
			return
		}
	}
}

func getList(listRepo *db.ListRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("listId")
		list, err := listRepo.FindById(r.Context(), id)
		if err != nil {
			http.Error(w, "", 500)
			return
		}
		err = json.NewEncoder(w).Encode(list)
		if err != nil {
			http.Error(w, "", 500)
			return
		}
	}
}

func getItemsByListId(itemRepo *db.ItemRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("listId")
		items, err := itemRepo.FindAllByListId(r.Context(), id)
		if err != nil {
			http.Error(w, "", 500)
			return
		}
		json.NewEncoder(w).Encode(items)

	}

}
func updateItemById(itemRepo db.ItemRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itemId := r.PathValue("itemId")
		patch := struct {
			Checked *bool `json:"checked"`
		}{}
		json.NewDecoder(r.Body).Decode(&patch)

		if patch.Checked == nil {
			slog.Error("no change")
			return
		}

		err := itemRepo.UpdateChecked(r.Context(), itemId, *patch.Checked)

		if err != nil {
			slog.Info("we got err", "err", err)
			http.Error(w, "bad", http.StatusInternalServerError)
			return
		}

	}
}
func moveItemById(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ids := struct {
			AfterId  *string `json:"afterId"` // id after which the item should be inserted
			ParentId *string `json:"parentId"`
		}{}
		json.NewDecoder(r.Body).Decode(&ids)

		itemId := r.PathValue("itemId")
		item, err := getItem(db, r.Context(), itemId)
		if err != nil {
			http.Error(w, "", 500)
			return
		}
		items, err := getAllItemsByListId(db, r.Context(), item.Parent)
		if err != nil {
			http.Error(w, "", 500)
			return
		}
		if ids.AfterId != nil {
			after, err := getItem(db, r.Context(), *ids.AfterId)
			if err != nil {
				http.Error(w, "", 500)
				return
			}
			// find "after" and the node after "after"
			foundAfter := false
			var afterAfter ShoppingListItem
			for _, i := range items {
				if i.Parent == after.Parent {
					if foundAfter {
						afterAfter = i
						break
					}
					if i.ID == *ids.AfterId {
						foundAfter = true
					}
				}
			}
			fmt.Printf("afterAfter: %v\n", afterAfter)

		}
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slog.DebugContext(r.Context(), "request", "remoteAttr", r.RemoteAddr, "method", r.Method, "path", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func main() {
	slog.SetLogLoggerLevel(slog.LevelDebug.Level())
	r := http.NewServeMux()

	dbConn, err := sql.Open("sqlite3", "db.sqlite")
	if err != nil {
		slog.Error("failed to open db", "err", err)
	}

	listRepo := db.NewListRepository(dbConn)
	itemRepo := db.NewItemRepository(dbConn)

	filesDir := http.Dir(filepath.Join("./frontend/dist"))

	r.Handle("GET /", http.FileServer(filesDir))
	r.Handle("GET /api/list/", getAllLists(listRepo))
	r.Handle("GET /api/list/{listId}/", getList(listRepo))
	r.Handle("GET /api/list/{listId}/item/", getItemsByListId(itemRepo))
	r.Handle("POST /api/list/{listId}/item/{itemId}", updateItemById(dbConn))
	r.Handle("POST /api/list/{listId}/item/{itemId}/move", moveItemById(dbConn))

	slog.Info("Application ready!", "address", "http://localhost:3333")

	handler := loggingMiddleware(r)

	http.ListenAndServe(":3333", handler)
}
