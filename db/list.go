package db

import (
	"context"
	"database/sql"
	"fmt"
)

type ShoppingList struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Date   string `json:"date"`
}

type ListRepository struct {
	db *sql.DB
}

func NewListRepository(db *sql.DB) *ListRepository {
	return &ListRepository{
		db: db,
	}
}

func (lr *ListRepository) FindAll(ctx context.Context) ([]ShoppingList, error) {
	rows, err := lr.db.QueryContext(ctx, "SELECT id, status, date FROM lists ORDER BY date DESC;")
	if err != nil {
		return nil, fmt.Errorf("failed to find list %w", err)
	}
	listItems := []ShoppingList{}
	for rows.Next() {
		list := ShoppingList{}
		err := rows.Scan(&list.ID, &list.Status, &list.Date)
		if err != nil {
			return nil, fmt.Errorf("failed to find list %w", err)
		}
		listItems = append(listItems, list)
	}

	return listItems, nil
}

func (lr *ListRepository) FindById(ctx context.Context, id string) (ShoppingList, error) {
	row := lr.db.QueryRowContext(ctx, "SELECT id, status, date FROM lists WHERE id = ?;", id)
	list := ShoppingList{}
	err := row.Scan(&list.ID, &list.Status, &list.Date)
	if err != nil {
		return ShoppingList{}, fmt.Errorf("failed to find list with id %s %w", id, err)
	}
	return list, nil
}
