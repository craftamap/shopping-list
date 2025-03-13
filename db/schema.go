package db

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"path"
)

const META_FILE = "0000_meta.sql"
const SCHEMA_TABLE_NAME = "schema"

func EnsureUpToDateSchema(schemaFs embed.FS, dbConn *sql.DB, ctx context.Context) error {
	schemaDir, err := fs.Sub(schemaFs, "schema")
	if err != nil {
		return fmt.Errorf("failed to read schema directory from schemaFs: %w", err)
	}

	row := dbConn.QueryRowContext(ctx, "SELECT name FROM sqlite_master WHERE type='table' AND name=?;", SCHEMA_TABLE_NAME)
	var tablename string
	err = row.Scan(&tablename)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("failed to check if schema table already exists: %w", err)
		}
		// Create meta table by executing schema file
		file, err := schemaDir.Open(META_FILE)
		if err != nil {
			return fmt.Errorf("failed to open meta schema file: %w", err)
		}
		defer file.Close()
		err = applySqlFile(file, dbConn, ctx, true)
		if err != nil {
			return fmt.Errorf("failed to apply meta schema file: %w", err)
		}

	}
	// ReadDir is sorted already. Neat.
	files, err := fs.ReadDir(schemaDir, ".")
	if err != nil {
		return fmt.Errorf("failed to read files directory from schemaFs: %w", err)
	}
	for _, dirEntry := range files {
		if dirEntry.Name() == META_FILE {
			continue
		}
		if !dirEntry.Type().IsRegular() {
			continue
		}
		if path.Ext(dirEntry.Name()) != ".sql" {
			continue
		}
		file, err := schemaDir.Open(dirEntry.Name())
		if err != nil {
			return fmt.Errorf("failed to open file %s: %w", dirEntry.Name(), err)
		}
		defer file.Close()

		err = applySqlFile(file, dbConn, ctx, false)
		if err != nil {
			return fmt.Errorf("failed to apply file %s: %w", dirEntry.Name(), err)
		}
	}

	return nil
}

func applySqlFile(file fs.File, dbConn *sql.DB, ctx context.Context, isInitialMetaTable bool) error {
	stat, _ := file.Stat()
	bytes, err := io.ReadAll(file)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}
	hasher := sha256.New()
	hasher.Write(bytes)
	hash := fmt.Sprintf("%x", hasher.Sum(nil))
	// TODO: check if already executed

	if !isInitialMetaTable {
		row := dbConn.QueryRow("SELECT filename, hash FROM schema WHERE filename=?", stat.Name())

		var filename string
		var storedHash string

		err := row.Scan(&filename, &storedHash)
		if err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				return fmt.Errorf("failed to check if schema table already exists: %w", err)
			}
		} else {
			if storedHash != hash {
				return fmt.Errorf("storedHash '%s' does not equal actual file hash '%s'", storedHash, hash)
			} else {
				slog.Info("file already applied", "filename", filename)
				return nil
			}
		}
	}

	tx, err := dbConn.BeginTx(ctx, nil)
	if err != nil {
		if err := tx.Rollback(); err != nil {
			return fmt.Errorf("failed to rollback: %w", err)
		}

		return fmt.Errorf("failed to open transaction: %w", err)
	}
	_, err = tx.ExecContext(ctx, string(bytes))
	if err != nil {
		if err := tx.Rollback(); err != nil {
			return fmt.Errorf("failed to rollback: %w", err)
		}
		return fmt.Errorf("failed to execute sql file: %w", err)
	}

	slog.Info("applied file", "filename", stat.Name())
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	if !isInitialMetaTable {
		_, err := dbConn.ExecContext(ctx, "INSERT INTO schema (filename, hash) VALUES (?, ?)", stat.Name(), hash)
		return err
	}
	return nil
}
