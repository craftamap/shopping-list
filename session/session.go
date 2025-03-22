package session

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/craftamap/shopping-list/db"
)

type ContentType string

const CONTEXT_SESSION_ID ContentType = "sessionId"

// we probably want to have this on a service-like struct?
func GetSessionValue(sessionRepo *db.SessionRepository, r *http.Request, key string) (json.RawMessage, bool) {
	sessionId, ok := r.Context().Value(CONTEXT_SESSION_ID).(string)
	if !ok {
		// todo: handle!
		return nil, false
	}
	session, err := sessionRepo.FindById(r.Context(), sessionId)
	if err != nil {
		return nil, false
	}
	value, ok := session.Data[key]
	return value, ok
}

func ResetSessionValues(sessionRepo *db.SessionRepository, r *http.Request) error {
	sessionId, ok := r.Context().Value(CONTEXT_SESSION_ID).(string)
	if !ok {
		return fmt.Errorf("failed to get sessionId from request context")
	}

	err := sessionRepo.Reset(r.Context(), sessionId)
	return err
}

func SetSessionValue(sessionRepo *db.SessionRepository, r *http.Request, key string, value json.RawMessage) error {
	sessionId, ok := r.Context().Value(CONTEXT_SESSION_ID).(string)
	if !ok {
		return fmt.Errorf("failed to get sessionId from request context")
	}
	err := sessionRepo.SetDataValue(r.Context(), sessionId, key, value)
	if err != nil {
		return fmt.Errorf("failed to set session value %w", err)
	}
	return nil
}

func createNewSession(w http.ResponseWriter, r *http.Request, sessionRepo *db.SessionRepository) (*http.Request, error) {
	session, err := sessionRepo.Create(r.Context(), 30*24*time.Hour)
	if err != nil {
		return r, fmt.Errorf("failed to create new session: %w", err)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "ShoppingSessionId",
		Value:    session.ID,
		Path:     "/",
		MaxAge:   int((30 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		// Strict does cause problems with Android mobile
		SameSite: http.SameSiteDefaultMode,
	})

	return r.WithContext(context.WithValue(r.Context(), CONTEXT_SESSION_ID, session.ID)), nil
}

func SessionMiddleware(next http.Handler, sessionRepo *db.SessionRepository) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		existingCookie, err := r.Cookie("ShoppingSessionId")
		if errors.Is(err, http.ErrNoCookie) {
			r, err = createNewSession(w, r, sessionRepo)
			if err != nil {
				slog.Error("Failed to create session; cant recover from this", "err", err)
				return
			}
		} else {
			existingSession, err := sessionRepo.FindById(r.Context(), existingCookie.Value)
			if err != nil {
				r, err = createNewSession(w, r, sessionRepo)
				if err != nil {
					slog.Error("Failed to create session; cant recover from this", "err", err)
					return
				}
			} else if existingSession.ExpiresAt.Before(time.Now()) {
				r, err = createNewSession(w, r, sessionRepo)
				if err != nil {
					slog.Error("Failed to create session; cant recover from this", "err", err)
					return
				}
			} else {
				r = r.WithContext(context.WithValue(r.Context(), CONTEXT_SESSION_ID, existingSession.ID))
			}
		}

		next.ServeHTTP(w, r)
	})
}
