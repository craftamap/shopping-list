package db

import (
	"context"
	"database/sql"
	"fmt"
)

type TransactionFunc func(ctx context.Context, fn func() error) error

func WithTransaction(dbConn *sql.DB) TransactionFunc {
	return func(ctx context.Context, fn func() error) error {
		tx, err := dbConn.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("failed to start transaction: %w", err)
		}
		err = fn()
		if err != nil {
			if err2 := tx.Rollback(); err2 != nil {
				return fmt.Errorf("failed to rollback: %w; original error: %w", err2, err)
			}
			return err
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit transaction: %w", err)
		}
		return nil
	}

}
