package main

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"slices"

	"log/slog"

	"github.com/craftamap/shopping-list/auth"
	"github.com/craftamap/shopping-list/db"
	"github.com/craftamap/shopping-list/events"
	"github.com/craftamap/shopping-list/services"
	"github.com/craftamap/shopping-list/session"
	_ "github.com/mattn/go-sqlite3"
	"github.com/urfave/cli/v3"
)

//go:embed frontend/dist
var embedFrontendFS embed.FS


//go:embed schema
var embedSchemaFS embed.FS

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
		json.NewDecoder(r.Body).Decode(&newItem)

		itemService.Create(r.Context(), listId, newItem.Text, newItem.After)
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

		err = itemService.MoveById(r.Context(), itemId, services.MoveInstructions{
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
func login(userRepo *db.UserRepository, sessionRepo *db.SessionRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseForm()
		if err != nil {
			slog.Error("failed to parse form", "err", err)
		}
		username := r.PostFormValue("username")
		password := r.PostFormValue("password")

		user, err := userRepo.FindByUsername(r.Context(), username)
		if err != nil {
			slog.Error("Failed to find user by username", "username", username, "err", err)
			http.Redirect(w, r, "/#/login", http.StatusSeeOther)
			return
		}

		match, err := auth.ComparePasswordAndHash(password, user.PasswordHash)
		if err != nil || !match {
			slog.Error("Failed to compare password", "err", err)
			http.Redirect(w, r, "/#/login", http.StatusSeeOther)
			return
		}

		err = session.ResetSessionValues(sessionRepo, r)
		if err != nil {
			slog.Error("Failed to reset session values", "err", err)
			http.Redirect(w, r, "/#/login", http.StatusSeeOther)
			return
		}

		userIDJson, err := json.Marshal(user.ID)
		if err != nil {
			slog.Error("Failed to marshal userID", "err", err)
			http.Redirect(w, r, "/#/login", http.StatusSeeOther)
			return
		}
		err = session.SetSessionValue(sessionRepo, r, auth.SESSION_VALUE_USERID, userIDJson)
		if err != nil {
			slog.Error("Failed to set session value", "err", err)
			http.Redirect(w, r, "/#/login", http.StatusSeeOther)
			return
		}

		http.Redirect(w, r, "/#/", http.StatusSeeOther)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slog.DebugContext(r.Context(), "request", "remoteAttr", r.RemoteAddr, "method", r.Method, "path", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func serve(useDirFS bool) error {
	r := http.NewServeMux()

	dbConn, err := sql.Open("sqlite3", "db.sqlite")
	if err != nil {
		return fmt.Errorf("failed to open db %w", err)
	}
	defer dbConn.Close()

	err = db.EnsureUpToDateSchema(embedSchemaFS, dbConn, context.Background())
	if err != nil {
		return fmt.Errorf("failed to ensure that schema is updated: %w", err)
	}

	hub := events.New()

	listRepo := db.NewListRepository(dbConn)
	itemRepo := db.NewItemRepository(dbConn)
	sessionRepo := db.NewSessionRepository(dbConn)
	userRepo := db.NewUserRepository(dbConn)

	listService := services.NewListService(listRepo, hub)
	itemService := services.NewItemRepository(listRepo, itemRepo, hub)

	var fileServer http.Handler
	if useDirFS {
		slog.Info("Serving files from directory")
		filesDir := os.DirFS("./frontend/dist")
		fileServer = http.FileServer(http.FS(filesDir))
	} else {
		slog.Info("Serving files from embedded filesystem")
		filesDir, err := fs.Sub(embedFrontendFS, "frontend/dist")
		if err != nil {
			return fmt.Errorf("failed to open fs %w", err)
		}
		fileServer = http.FileServer(http.FS(filesDir))
	}

	fsRouter := http.NewServeMux()
	fsRouter.Handle("GET /", fileServer)

	apiRouter := http.NewServeMux()
	apiRouter.Handle("GET /api/events/", events.EstablishConnection(hub))
	apiRouter.Handle("GET /api/list/", getAllLists(listService))
	apiRouter.Handle("POST /api/list/", createList(listService))
	apiRouter.Handle("GET /api/list/{listId}/", getList(listService))
	apiRouter.Handle("PATCH /api/list/{listId}/", updateList(listService))
	apiRouter.Handle("GET /api/list/{listId}/item/", getItemsByListId(itemService))
	apiRouter.Handle("POST /api/list/{listId}/item/", createItemForListId(itemService))
	apiRouter.Handle("PATCH /api/list/{listId}/item/{itemId}", updateItemById(itemService))
	apiRouter.Handle("DELETE /api/list/{listId}/item/{itemId}", deleteItemById(itemService))
	apiRouter.Handle("POST /api/list/{listId}/item/{itemId}/move", moveItemById(itemService))

	r.Handle("/", fsRouter)
	r.Handle("/api/", auth.EnsureSessionAuthMiddleware(apiRouter, sessionRepo))
	r.Handle("POST /login", login(userRepo, sessionRepo))

	slog.Info("Application ready!", "address", "http://localhost:3333")

	handler := loggingMiddleware(r)
	handler = session.SessionMiddleware(handler, sessionRepo)

	err = http.ListenAndServe("0.0.0.0:3333", handler)
	if err != nil {
		return fmt.Errorf("failed to start webserver %w", err)
	}
	return nil
}

func main() {
	slog.SetLogLoggerLevel(slog.LevelDebug.Level())

	cmd := &cli.Command{
		Commands: []*cli.Command{
			{
				Name: "serve",
				Action: func(ctx context.Context, c *cli.Command) error {
					useDirFS := c.Bool("dirFS")
					return serve(useDirFS)
				},
				Flags: []cli.Flag{
					&cli.BoolFlag{
						Name:  "dirFS",
						Value: false,
					},
				},
			},
			{
				Name: "user",
				Commands: []*cli.Command{
					{
						Name: "create",
						Action: func(ctx context.Context, c *cli.Command) error {
							fmt.Print("username: ")

							var username string
							_, err := fmt.Scan(&username)
							if err != nil {
								return fmt.Errorf("failed to read username: %w", err)
							}
							if len(username) < 3 {
								return fmt.Errorf("username must be at least 3 letters long")
							}
							fmt.Print("password: ")

							var password string
							_, err = fmt.Scan(&password)
							if err != nil {
								return fmt.Errorf("failed to read password: %w", err)
							}
							if len(password) < 3 {
								return fmt.Errorf("password must be at least 3 letters long")
							}

							slog.Info("got values", "username", username, "password", password)

							encodedHash, err := auth.GenerateFromPassword(password)
							if err != nil {
								return fmt.Errorf("failed to create hash from password: %w", err)
							}

							dbConn, err := sql.Open("sqlite3", "db.sqlite")
							if err != nil {
								return fmt.Errorf("failed to connect to database: %w", err)
							}
							userRepo := db.NewUserRepository(dbConn)
							_, err = userRepo.Create(ctx, username, encodedHash)
							if err != nil {
								return fmt.Errorf("failed to create user: %w", err)
							}

							return nil
						},
					},
				},
			},
		},
		DefaultCommand: "serve",
	}

	if err := cmd.Run(context.Background(), os.Args); err != nil {
		slog.Error("error during execution", "err", err)
		os.Exit(1)
	}
}
