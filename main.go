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

func createList(listRepo *db.ListRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		list, err := listRepo.Create(r.Context())
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

func updateList(listRepo *db.ListRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		listId := r.PathValue("listId")
		_, err := listRepo.FindById(r.Context(), listId)
		if err != nil {
			http.Error(w, "", 500)
			return
		}

		var updateListStatus struct {
			Status string `json:"status"`
		}
		err = json.NewDecoder(r.Body).Decode(&updateListStatus)
		if err != nil {
			http.Error(w, err.Error(), 400)
		}

		status := updateListStatus.Status
		validStatus := slices.Contains(([]string{"inprogress", "todo", "done"}), status)
		if !validStatus {
			http.Error(w, "invalid status", 400)
			return
		}

		err = listRepo.UpdateStatus(r.Context(), listId, status)
		if err != nil {
			http.Error(w, err.Error(), 400)
		}

		// refetch list
		list, err := listRepo.FindById(r.Context(), listId)
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

func getItemsByListId(listRepo *db.ListRepository, itemRepo *db.ItemRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("listId")
		_, err := listRepo.FindById(r.Context(), id)
		if err != nil {
			http.Error(w, err.Error(), 400)
		}
		items, err := itemRepo.FindAllByListId(r.Context(), id)
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

func findHighestSort(existingItems []db.ShoppingListItem) [2]int {
	sortFractions := [2]int{0, 1}
	sort := 0.0
	for _, item := range existingItems {
		if item.Parent == nil && item.Sort > sort {
			sort = item.Sort
			sortFractions = [2]int(item.SortFractions)
		}
	}
	return sortFractions
}

func createItemForListId(listRepo *db.ListRepository, itemRepo *db.ItemRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		listId := r.PathValue("listId")
		_, err := listRepo.FindById(r.Context(), listId)
		if err != nil {
			http.Error(w, err.Error(), 400)
		}
		type NewShoppingListItem struct {
			Text  string  `json:"text"`
			After *string `json:"after"`
		}
		// TODO: add after support for creating new items
		var newItem NewShoppingListItem
		json.NewDecoder(r.Body).Decode(&newItem)
		existingItems, err := itemRepo.FindAllByListId(r.Context(), listId)
		if err != nil {
			http.Error(w, err.Error(), 400)
		}
		highestSort := findHighestSort(existingItems)
		newSort := [2]int{highestSort[0] + 1, highestSort[1]}

		itemRepo.Create(r.Context(), listId, newItem.Text, newSort)
	}
}

func updateItemById(itemRepo *db.ItemRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itemId := r.PathValue("itemId")
		patch := struct {
			Text    *string `json:"text"`
			Checked *bool   `json:"checked"`
		}{}
		json.NewDecoder(r.Body).Decode(&patch)

		if patch.Checked == nil && patch.Text == nil {
			slog.Error("no change")
			return
		}

		if patch.Checked != nil {
			err := itemRepo.UpdateChecked(r.Context(), itemId, *patch.Checked)
			if err != nil {
				slog.Info("we got err", "err", err)
				http.Error(w, "bad", http.StatusInternalServerError)
				return
			}
		}
		if patch.Text != nil {
			err := itemRepo.UpdateText(r.Context(), itemId, *patch.Text)
			if err != nil {
				slog.Info("we got err", "err", err)
				http.Error(w, "bad", http.StatusInternalServerError)
				return
			}
		}
	}
}

func deleteItemById(itemRepo *db.ItemRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itemId := r.PathValue("itemId")

		err := itemRepo.Delete(r.Context(), itemId)
		if err != nil {
			slog.Info("we got err", "err", err)
			http.Error(w, "bad", http.StatusInternalServerError)
			return
		}
	}
}

func moveItemById(itemRepo *db.ItemRepository) http.HandlerFunc {
	findById := func(items []db.ShoppingListItem, id string) *db.ShoppingListItem {
		for _, item := range items {
			if item.ID == id {
				return &item
			}
		}
		return nil
	}

	return func(w http.ResponseWriter, r *http.Request) {
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

		itemId := r.PathValue("itemId")
		item, err := itemRepo.FindById(r.Context(), itemId)

		if err != nil {
			slog.Info("we got err", "err", err)
			http.Error(w, err.Error(), 500)
			return
		}
		items, err := itemRepo.FindAllByListId(r.Context(), item.List)
		if err != nil {
			slog.Info("we got err", "err", err)
			http.Error(w, err.Error(), 500)
			return
		}
		var after *db.ShoppingListItem  // moved item will be placed AFTER after
		var before *db.ShoppingListItem // moved item will be placed BEFORE before
		var parentId *string
		if ids.AfterId != nil {
			foundById := findById(items, *ids.AfterId)
			if foundById == nil {
				slog.Info("we got err", "err", err)
				http.Error(w, err.Error(), 500)
				return
			}
			after = foundById
			parentId = after.Parent
			// find "after" and the node after "after"
			foundAfter := false
			var afterAfter *db.ShoppingListItem
			for _, i := range items {
				if (i.Parent == nil && after.Parent == nil) || (i.Parent != nil && after.Parent != nil && *(i.Parent) == *(after.Parent)) {
					if foundAfter && i.ID != itemId {
						afterAfter = &i
						break
					}
					if i.ID == *ids.AfterId {
						foundAfter = true
					}
				}
			}
			before = afterAfter
		} else if ids.ParentId != nil {
			// fixme: check if ids.ParentId actually exists
			parentId = ids.ParentId

			var firstItemWithParent *db.ShoppingListItem
			for _, item := range items {
				if item.Parent != nil && *item.Parent == *ids.ParentId {
					firstItemWithParent = &item
					break
				}
			}

			before = firstItemWithParent
		}

		numerator := 0
		if after != nil {
			numerator = numerator + after.SortFractions[0]
		} else {
			numerator = numerator + 0
		}
		if before != nil {
			numerator = numerator + before.SortFractions[0]
		} else {
			numerator = numerator + 1
		}

		denominator := 0
		if after != nil {
			denominator = denominator + after.SortFractions[1]
		} else {
			denominator = denominator + 1
		}
		if before != nil {
			denominator = denominator + before.SortFractions[1]
		} else {
			denominator = denominator + 0
		}

		newSortFractions := []int{numerator, denominator}

		slog.Debug("move data", "itemId", itemId, "before", before, "after", after, "parentId", parentId, "newSortFractions", newSortFractions)
		err = itemRepo.Move(r.Context(), itemId, parentId, newSortFractions)
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

	filesDir := http.Dir(filepath.Join("./frontend/dist"))

	r.Handle("GET /", http.FileServer(filesDir))
	r.Handle("GET /api/list/", getAllLists(listRepo))
	r.Handle("POST /api/list/", createList(listRepo))
	r.Handle("GET /api/list/{listId}/", getList(listRepo))
	r.Handle("PATCH /api/list/{listId}/", updateList(listRepo))
	r.Handle("GET /api/list/{listId}/item/", getItemsByListId(listRepo, itemRepo))
	r.Handle("POST /api/list/{listId}/item/", createItemForListId(listRepo, itemRepo))
	r.Handle("PATCH /api/list/{listId}/item/{itemId}", updateItemById(itemRepo))
	r.Handle("DELETE /api/list/{listId}/item/{itemId}", deleteItemById(itemRepo))
	r.Handle("POST /api/list/{listId}/item/{itemId}/move", moveItemById(itemRepo))

	slog.Info("Application ready!", "address", "http://localhost:3333")

	handler := loggingMiddleware(r)

	err = http.ListenAndServe("0.0.0.0:3333", handler)
	if err != nil {
		slog.Error("failed to start webserver", "err", err)
		os.Exit(1)
	}
}
