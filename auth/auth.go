package auth

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/craftamap/shopping-list/db"
	"github.com/craftamap/shopping-list/session"
)

const SESSION_VALUE_USERID = "userID"

func EnsureSessionAuthMiddleware(next http.Handler, sessionRepo *db.SessionRepository) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userIDJson, ok := session.GetSessionValue(sessionRepo, r, SESSION_VALUE_USERID)
		if !ok {
			slog.ErrorContext(r.Context(), "failed to get userID from session value")
			w.WriteHeader(403)
			return
		}

		var userID int
		err := json.Unmarshal(userIDJson, &userID)
		if err != nil {
			slog.ErrorContext(r.Context(), "failed to unmarshal userID", "err", err)
			// this is unexpected: if we have a userID in the session context, but it's not a string, something is off...

			w.WriteHeader(500)
			return
		}
		// TODO: we could validate if the user actually exists. But since we control the string, this is unneeded.

		next.ServeHTTP(w, r)
	})
}
