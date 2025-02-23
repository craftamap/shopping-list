package db

import (
	"context"
	"database/sql"
)

type User struct {
	ID           int
	Username     string
	PasswordHash string
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{
		db,
	}
}

func (ur *UserRepository) FindByUsername(ctx context.Context, username string) (User, error) {
	row := ur.db.QueryRowContext(ctx, "SELECT id, username, passwordHash FROM users WHERE username = ?", username)

	user := User{}
	err := row.Scan(&user.ID, &user.Username, &user.PasswordHash)
	return user, err
}

func (ur *UserRepository) Create(ctx context.Context, username string, hash string) (User, error) {
	row := ur.db.QueryRowContext(ctx, "INSERT INTO users (username, passwordHash) VALUES (?, ?) RETURNING id, username, passwordHash", username, hash)

	user := User{}
	err := row.Scan(&user.ID, &user.Username, &user.PasswordHash)
	return user, err
}
