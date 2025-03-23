package services

import (
	"context"
	"fmt"
	"iter"
	"log/slog"
	"slices"

	"github.com/craftamap/shopping-list/db"
	"github.com/craftamap/shopping-list/events"
)

type ItemService struct {
	listRepo *db.ListRepository
	itemRepo *db.ItemRepository
	txFunc   db.TransactionFunc
	eventHub *events.EventHub
}

func NewItemService(listRepo *db.ListRepository, itemRepo *db.ItemRepository, txFunc db.TransactionFunc, eventHub *events.EventHub) *ItemService {
	return &ItemService{
		listRepo: listRepo,
		itemRepo: itemRepo,
		txFunc:   txFunc,
		eventHub: eventHub,
	}
}

func (is *ItemService) FindAllByListId(ctx context.Context, listId string) ([]db.ShoppingListItem, error) {
	_, err := is.listRepo.FindById(ctx, listId)
	if err != nil {
		return nil, fmt.Errorf("Error getting list while finding items: %w", err)
	}
	items, err := is.itemRepo.FindAllByListId(ctx, listId)
	if err != nil {
		return nil, fmt.Errorf("Error finding items: %w", err)
	}
	return items, nil
}

func findHighestSort(existingItems []db.ShoppingListItem) [2]int {
	sortFractions := [2]int{0, 1}
	sort := 0.0
	for _, item := range existingItems {
		if item.Parent == nil && item.Sort > sort {
			sort = item.Sort
			sortFractions = [2]int(item.SortFractions)
		}
	}
	return sortFractions
}

func (is *ItemService) Create(ctx context.Context, listId string, text string, after *string) error {
	_, err := is.listRepo.FindById(ctx, listId)
	if err != nil {
		return fmt.Errorf("Error getting list while creating item: %w", err)
	}

	existingItems, err := is.itemRepo.FindAllByListId(ctx, listId)
	if err != nil {
		return fmt.Errorf("Error getting list while finding items: %w", err)
	}
	highestSort := findHighestSort(existingItems)
	newSort := [2]int{highestSort[0] + 1, highestSort[1]}

	itemId, err := is.itemRepo.Create(ctx, listId, text, newSort)
	if err != nil {
		return fmt.Errorf("Error getting list while creating item: %w", err)
	}

	go func() {
		err = is.eventHub.Publish(events.NewItemsInListChangedEvent(listId))
		if err != nil {
			slog.Error("error during publish", "err", err)
		}
	}()

	if after == nil {
		return nil
	}

	return is.MoveById(ctx, itemId, MoveInstructions{
		AfterId: after,
	})
}

func (is *ItemService) UpdateById(ctx context.Context, itemId string, text *string, checked *bool) error {
	if text == nil && checked == nil {
		return nil
	}
	item, err := is.itemRepo.FindByID(ctx, itemId)
	if err != nil {
		return fmt.Errorf("Failed to get item to be updated: %w", err)
	}

	if checked != nil {
		err := is.itemRepo.UpdateChecked(ctx, itemId, *checked)
		if err != nil {
			return fmt.Errorf("Failed to update checked for item: %w", err)
		}
	}
	if text != nil {
		err := is.itemRepo.UpdateText(ctx, itemId, *text)
		if err != nil {
			return fmt.Errorf("Failed to update text for item")
		}
	}

	go func() {
		err = is.eventHub.Publish(events.NewItemsInListChangedEvent(item.List))
		if err != nil {
			slog.Error("error during publish", "err", err)
			return
		}
	}()
	return nil
}

func (is *ItemService) DeleteById(ctx context.Context, itemId string) error {
	item, err := is.itemRepo.FindByID(ctx, itemId)
	if err != nil {
		return fmt.Errorf("Failed to find item to delete %w", err)
	}

	allItems, err := is.FindAllByListId(ctx, item.List)
	if err != nil {
		return fmt.Errorf("Failed to find items %w", err)
	}

	// DeleteFunc is sortof in-place inverted .filter. Good enough for this
	children := slices.DeleteFunc(allItems, func(i db.ShoppingListItem) bool {
		if i.Parent == nil {
			return true
		}
		return (*i.Parent) != item.ID
	})
	// order needs to be inverted, as we move the items after the to-be-deleted item one by one
	slices.SortFunc(children, func(a, b db.ShoppingListItem) int {
		if a.Sort < b.Sort {
			return 1
		}
		if a.Sort > b.Sort {
			return -1
		}
		return 0
	})
	slog.Info("children ", "children", children)
	for _, child := range children {
		err := is.MoveById(ctx, child.ID, MoveInstructions{
			AfterId: &item.ID,
		})
		if err != nil {
			return fmt.Errorf("Failed to move child before deleting item: %w", err)
		}
	}

	err = is.itemRepo.Delete(ctx, itemId)
	if err != nil {
		return fmt.Errorf("Failed to delete item %w", err)
	}
	go func() {
		_ = is.eventHub.Publish(events.NewItemsInListChangedEvent(item.List))
	}()
	return nil
}

type MoveInstructions struct {
	AfterId  *string
	ParentId *string
}

func findByID(items []db.ShoppingListItem, id string) (*db.ShoppingListItem, bool) {
	for _, item := range items {
		if item.ID == id {
			return &item, true
		}
	}
	return nil, false
}

func getAnchestors(items []db.ShoppingListItem, startItemID string) iter.Seq[*db.ShoppingListItem] {
	return func(yield func(*db.ShoppingListItem) bool) {
		item, ok := findByID(items, startItemID)
		if !ok {
			return
		}
		for item != nil {
			if !yield(item) {
				return
			}
			if item.Parent == nil {
				return
			}
			item, ok = findByID(items, *item.Parent)
			if !ok {
				return
			}
		}
	}

}

func (is *ItemService) MoveById(ctx context.Context, itemId string, moveInstr MoveInstructions) error {
	item, err := is.itemRepo.FindByID(ctx, itemId)
	if err != nil {
		return fmt.Errorf("failed to get item while moving: %w", err)
	}

	items, err := is.itemRepo.FindAllByListId(ctx, item.List)
	if err != nil {
		return fmt.Errorf("failed to get items while moving: %w", err)
	}

	var after *db.ShoppingListItem  // moved item will be placed AFTER after
	var before *db.ShoppingListItem // moved item will be placed BEFORE before
	var parentId *string
	if moveInstr.AfterId != nil {
		foundById, ok := findByID(items, *moveInstr.AfterId)
		if !ok {
			return fmt.Errorf("failed to find item with AfterId")
		}
		after = foundById
		parentId = after.Parent
		// find "after" and the node after "after"
		foundAfter := false
		var afterAfter *db.ShoppingListItem
		for _, i := range items {
			if (i.Parent == nil && after.Parent == nil) || (i.Parent != nil && after.Parent != nil && *(i.Parent) == *(after.Parent)) {
				if foundAfter && i.ID != itemId {
					afterAfter = &i
					break
				}
				if i.ID == *moveInstr.AfterId {
					foundAfter = true
				}
			}
		}
		before = afterAfter
	} else if moveInstr.ParentId != nil {
		parent, ok := findByID(items, *moveInstr.ParentId)
		if !ok {
			return fmt.Errorf("failed to find item with ParentId")
		}
		parentId = &parent.ID

		var firstItemWithParent *db.ShoppingListItem
		for _, item := range items {
			if item.Parent != nil && *item.Parent == *moveInstr.ParentId {
				firstItemWithParent = &item
				break
			}
		}

		before = firstItemWithParent
	}
	if parentId != nil {
		for anchestor := range getAnchestors(items, *parentId) {
			if anchestor.ID == item.ID {
				// this means that the new parent would have the item as an anchestor, leading to a looping tree
				return fmt.Errorf("illegal tree")
			}
		}
	}

	numerator := 0
	if after != nil {
		numerator = numerator + after.SortFractions[0]
	} else {
		numerator = numerator + 0
	}
	if before != nil {
		numerator = numerator + before.SortFractions[0]
	} else {
		numerator = numerator + 1
	}

	denominator := 0
	if after != nil {
		denominator = denominator + after.SortFractions[1]
	} else {
		denominator = denominator + 1
	}
	if before != nil {
		denominator = denominator + before.SortFractions[1]
	} else {
		denominator = denominator + 0
	}

	newSortFractions := []int{numerator, denominator}

	err = is.itemRepo.Move(ctx, itemId, parentId, newSortFractions)
	if err != nil {
		return fmt.Errorf("failed to move item: %w", err)
	}
	go func() {
		// FIXME: check error response
		_ = is.eventHub.Publish(events.NewItemsInListChangedEvent(item.List))
	}()

	return nil
}
