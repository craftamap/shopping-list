package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"slices"

	"log/slog"

	"github.com/craftamap/shopping-list/db"
	"github.com/craftamap/shopping-list/services"
	_ "github.com/mattn/go-sqlite3"
)

func getAllLists(listService *services.ListService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lists, err := listService.GetAll(r.Context())
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		err = json.NewEncoder(w).Encode(lists)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
	}
}

func createList(listService *services.ListService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		list, err := listService.Create(r.Context())
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		err = json.NewEncoder(w).Encode(list)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
	}
}

func getList(listService *services.ListService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("listId")
		list, err := listService.FindById(r.Context(), id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		err = json.NewEncoder(w).Encode(list)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
	}
}

func updateList(listService *services.ListService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		listId := r.PathValue("listId")
		var updateListStatus struct {
			Status string `json:"status"`
		}
		err := json.NewDecoder(r.Body).Decode(&updateListStatus)
		if err != nil {
			http.Error(w, err.Error(), 400)
		}

		status := updateListStatus.Status
		validStatus := slices.Contains(([]string{"inprogress", "todo", "done"}), status)
		if !validStatus {
			http.Error(w, "invalid status", 400)
			return
		}

		list, err := listService.Update(r.Context(), listId, status)
		if err != nil {
			http.Error(w, err.Error(), 500)
		}

		err = json.NewEncoder(w).Encode(list)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
	}
}

func getItemsByListId(itemService *services.ItemService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("listId")
		items, err := itemService.FindAllByListId(r.Context(), id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		err = json.NewEncoder(w).Encode(items)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
	}
}

func createItemForListId(itemService *services.ItemService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		listId := r.PathValue("listId")
		type NewShoppingListItem struct {
			Text  string  `json:"text"`
			After *string `json:"after"`
		}
		var newItem NewShoppingListItem
		// TODO: add after support for creating new items
		json.NewDecoder(r.Body).Decode(&newItem)

		itemService.Create(r.Context(), listId, newItem.Text)
	}
}

func updateItemById(itemService *services.ItemService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itemId := r.PathValue("itemId")
		patch := struct {
			Text    *string `json:"text"`
			Checked *bool   `json:"checked"`
		}{}
		json.NewDecoder(r.Body).Decode(&patch)

		itemService.UpdateById(r.Context(), itemId, patch.Text, patch.Checked)
	}
}

func deleteItemById(itemService *services.ItemService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itemId := r.PathValue("itemId")

		err := itemService.DeleteById(r.Context(), itemId)
		if err != nil {
			slog.Info("we got err", "err", err)
			http.Error(w, "bad", http.StatusInternalServerError)
			return
		}
	}
}

func moveItemById(itemService *services.ItemService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itemId := r.PathValue("itemId")
		ids := struct {
			AfterId  *string `json:"afterId"` // id after which the item should be inserted
			ParentId *string `json:"parentId"`
		}{}
		err := json.NewDecoder(r.Body).Decode(&ids)
		if err != nil {
			slog.Info("we got err", "err", err)
			http.Error(w, "", http.StatusInternalServerError)
			return
		}

		itemService.MoveById(r.Context(), itemId, services.MoveInstructions{
			AfterId:  ids.AfterId,
			ParentId: ids.ParentId,
		})

		if err != nil {
			slog.Info("we got err", "err", err)
			http.Error(w, err.Error(), 500)
			return
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
		os.Exit(1)
	}

	listRepo := db.NewListRepository(dbConn)
	itemRepo := db.NewItemRepository(dbConn)

	listService := services.NewListService(listRepo)
	itemService := services.NewItemRepository(listRepo, itemRepo)

	filesDir := http.Dir(filepath.Join("./frontend/dist"))

	r.Handle("GET /", http.FileServer(filesDir))
	r.Handle("GET /api/list/", getAllLists(listService))
	r.Handle("POST /api/list/", createList(listService))
	r.Handle("GET /api/list/{listId}/", getList(listService))
	r.Handle("PATCH /api/list/{listId}/", updateList(listService))
	r.Handle("GET /api/list/{listId}/item/", getItemsByListId(itemService))
	r.Handle("POST /api/list/{listId}/item/", createItemForListId(itemService))
	r.Handle("PATCH /api/list/{listId}/item/{itemId}", updateItemById(itemService))
	r.Handle("DELETE /api/list/{listId}/item/{itemId}", deleteItemById(itemService))
	r.Handle("POST /api/list/{listId}/item/{itemId}/move", moveItemById(itemService))

	slog.Info("Application ready!", "address", "http://localhost:3333")

	handler := loggingMiddleware(r)

	err = http.ListenAndServe("0.0.0.0:3333", handler)
	if err != nil {
		slog.Error("failed to start webserver", "err", err)
		os.Exit(1)
	}
}
