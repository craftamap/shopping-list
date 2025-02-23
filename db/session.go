package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Session struct {
	ID        string
	Data      map[string]json.RawMessage
	ExpiresAt time.Time
}

type SessionRepository struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) *SessionRepository {
	return &SessionRepository{
		db,
	}
}

func (sr *SessionRepository) FindById(ctx context.Context, id string) (Session, error) {
	row := sr.db.QueryRowContext(ctx, "SELECT id, data, expiresAt FROM sessions WHERE id = ?", id)

	session := Session{}
	var sessionDataStr string
	var timeStr string
	err := row.Scan(&session.ID, &sessionDataStr, &timeStr)
	if err != nil {
		return Session{}, err
	}

	err = json.Unmarshal([]byte(sessionDataStr), &session.Data)
	if err != nil {
		return Session{}, err
	}

	t, err := time.Parse(time.RFC3339, timeStr)
	if err != nil {
		return Session{}, err
	}
	session.ExpiresAt = t

	return session, nil
}

func (sr *SessionRepository) Create(ctx context.Context, expiresIn time.Duration) (Session, error) {
	id := uuid.Must(uuid.NewV7())
	expiresAt := time.Now().Add(expiresIn)

	_, err := sr.db.ExecContext(ctx, "INSERT INTO sessions (id, data, expiresAt) VALUES (?, ?, ?)", id.String(), "{}", expiresAt.Format(time.RFC3339))
	if err != nil {
		return Session{}, err
	}

	return Session{
		ID:        id.String(),
		Data:      map[string]json.RawMessage{},
		ExpiresAt: expiresAt,
	}, nil
}

func (sr *SessionRepository) Reset(ctx context.Context, id string) error {
	_, err := sr.db.ExecContext(ctx, "UPDATE sessions SET data = json('{}') WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("Failed to reset session data for id %s: %w", id, err)
	}

	return nil
}

func (sr *SessionRepository) SetDataValue(ctx context.Context, id string, key string, value json.RawMessage) error {
	_, err := sr.db.ExecContext(ctx, "UPDATE sessions SET data = json_set(data, ?, json(?)) WHERE id = ?", "$."+key, string(value), id)
	if err != nil {
		return fmt.Errorf("Failed to reset session data for id %s: %w", id, err)
	}

	return nil
}
