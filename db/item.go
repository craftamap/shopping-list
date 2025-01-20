package db

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/binary"
	"slices"

	"github.com/google/uuid"
)

type ShoppingListItem struct {
	ID            string  `json:"id"`
	Text          string  `json:"text"`
	Checked       bool    `json:"checked"`
	Parent        *string `json:"parent"`
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

		err = rows.Scan(&item.ID, &item.Text, &item.Checked, &item.Parent, &item.Sort, &rawSortFractions, &item.List)
		if err != nil {
			return nil, err
		}
		if (len(rawSortFractions)) > 0 {
			item.SortFractions = []int{
				int(binary.LittleEndian.Uint32(rawSortFractions[0:4])),
				int(binary.LittleEndian.Uint32(rawSortFractions[4:8])),
			}
		}
		items = append(items, item)
	}

	return items, nil
}

func (ir *ItemRepository) FindById(ctx context.Context, itemId string) (ShoppingListItem, error) {
	row := ir.db.QueryRowContext(ctx, "SELECT id, text, checked, parent, sort, sortFractions, list FROM items WHERE id = ? LIMIT 1;", itemId)

	item := ShoppingListItem{}
	var rawSortFractions []byte
	err := row.Scan(&item.ID, &item.Text, &item.Checked, &item.Parent, &item.Sort, &rawSortFractions, &item.List)
	if err != nil {
		return ShoppingListItem{}, err
	}
	if (len(rawSortFractions)) > 0 {
		item.SortFractions = []int{
			int(binary.LittleEndian.Uint32(rawSortFractions[0:4])),
			int(binary.LittleEndian.Uint32(rawSortFractions[4:8])),
		}
	}

	return item, nil
}

func (ir *ItemRepository) Create(ctx context.Context, listId string, text string, sortFractions [2]int) (string, error) {
	id, err := uuid.NewV7()
	if err != nil {
		return "", err
	}

	sort := float64(sortFractions[0]) / float64(sortFractions[1])
	buf := new(bytes.Buffer)
	binary.Write(buf, binary.LittleEndian, uint32(sortFractions[0]))
	binary.Write(buf, binary.LittleEndian, uint32(sortFractions[1]))

	_, err = ir.db.ExecContext(ctx, "INSERT INTO items (id, text, checked, parent, sort, sortFractions, list) VALUES (?, ?, ?, ?, ?, ?, ?)", id, text, false, nil, sort, buf.Bytes(), listId)

	return id.String(), err
}

func (ir *ItemRepository) UpdateChecked(ctx context.Context, itemId string, checked bool) error {
	_, err := ir.db.ExecContext(ctx, "UPDATE items SET checked=? WHERE id = ?;", checked, itemId)
	return err
}

func (ir *ItemRepository) UpdateText(ctx context.Context, itemId string, text string) error {
	_, err := ir.db.ExecContext(ctx, "UPDATE items SET text=? WHERE id = ?;", text, itemId)
	return err
}

func (ir *ItemRepository) Move(ctx context.Context, itemId string, parentId *string, sortFractions []int) error {
	sort := float64(sortFractions[0]) / float64(sortFractions[1])
	buf := new(bytes.Buffer)
	binary.Write(buf, binary.LittleEndian, uint32(sortFractions[0]))
	binary.Write(buf, binary.LittleEndian, uint32(sortFractions[1]))

	_, err := ir.db.ExecContext(ctx, "UPDATE items SET parent=?, sort=?, sortFractions=? WHERE id=?;", parentId, sort, buf.Bytes(), itemId)
	return err
}

func (ir *ItemRepository) Delete(ctx context.Context, itemId string) error {
	item, err := ir.FindById(ctx, itemId)
	if err != nil {
		return err
	}
	children, err := ir.FindAllByListId(ctx, item.List)
	if err != nil {
		return err
	}
	slices.DeleteFunc(children, func(i ShoppingListItem) bool {
		if i.Parent == nil {
			return true
		}
		return (*i.Parent) != item.ID
	})

	for _, _ = range children {
		// refactor:  we would need a service layer, as we would need a moveAfter here?
		// TODO: moveAfter
	}

	_, err = ir.db.ExecContext(ctx, "DELETE FROM items WHERE id = ?", itemId)
	return err
}
