package db

import (
	"context"
	"database/sql"
	"encoding/binary"
)

type ShoppingListItem struct {
	ID            string  `json:"id"`
	Text          string  `json:"text"`
	Checked       bool    `json:"checked"`
	Parent        string  `json:"parent"`
	List          string  `json:"list"`
	Sort          float64 `json:"sort"`
	SortFractions []int   `json:"-"`
}

type ItemRepository struct {
	db *sql.DB
}

func NewItemRepository(db *sql.DB) *ItemRepository {
	return &ItemRepository{
		db: db,
	}
}

func (ir *ItemRepository) FindAllByListId(ctx context.Context, listId string) ([]ShoppingListItem, error) {
	rows, err := ir.db.QueryContext(ctx, "SELECT id, text, checked, parent, sort, sortFractions, list FROM items WHERE list = ? ORDER BY sort ASC;", listId)
	if err != nil {
		return nil, err
	}

	items := []ShoppingListItem{}
	for rows.Next() {
		item := ShoppingListItem{}
		var rawSortFractions []byte

		_ = rows.Scan(&item.ID, &item.Text, &item.Checked, &item.Parent, &item.Sort, &rawSortFractions, &item.List)
		if (len(rawSortFractions)) > 0 {
			item.SortFractions = []int{
				int(binary.BigEndian.Uint32(rawSortFractions[0:4])),
				int(binary.BigEndian.Uint32(rawSortFractions[4:8])),
			}
		}
		items = append(items, item)
	}

	return items, nil
}

func (ir *ItemRepository) FindById(ctx context.Context, itemId string) (ShoppingListItem, error) {
	row := ir.db.QueryRowContext(ctx, "SELECT id, text, checked, parent, sort, sortFractions, list FROM items WHERE id = ? LIMIT 1;")

	item := ShoppingListItem{}
	var rawSortFractions []byte
	err := row.Scan(&item.ID, &item.Text, &item.Checked, &item.Parent, &item.Sort, &rawSortFractions, &item.List)
	if err != nil {
		return ShoppingListItem{}, err
	}
	if (len(rawSortFractions)) > 0 {
		item.SortFractions = []int{
			int(binary.BigEndian.Uint32(rawSortFractions[0:4])),
			int(binary.BigEndian.Uint32(rawSortFractions[4:8])),
		}
	}

	return item, nil
}

func (ir *ItemRepository) UpdateChecked(ctx context.Context, itemId string, checked bool) error {
	_, err := ir.db.ExecContext(ctx, "UPDATE items SET checked=? WHERE id = ?;", checked, itemId)
	return err
}
