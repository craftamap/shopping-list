package services

import (
	"context"
	"fmt"

	"github.com/craftamap/shopping-list/db"
)

type ItemService struct {
	listRepo *db.ListRepository
	itemRepo *db.ItemRepository
}

func NewItemRepository(listRepo *db.ListRepository, itemRepo *db.ItemRepository) *ItemService {
	return &ItemService{
		listRepo: listRepo,
		itemRepo: itemRepo,
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

func (is *ItemService) Create(ctx context.Context, listId string, text string) error {
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

	return is.itemRepo.Create(ctx, listId, text, newSort)
}

func (is *ItemService) UpdateById(ctx context.Context, itemId string, text *string, checked *bool) error {
	if text == nil && checked == nil {
		return nil
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

	return nil
}

func (is *ItemService) DeleteById(ctx context.Context, itemId string) error {
	err := is.itemRepo.Delete(ctx, itemId)
	if err != nil {
		return fmt.Errorf("Failed to delete item %w", err)
	}
	return nil
}

type MoveInstructions struct {
	AfterId  *string
	ParentId *string
}

func findById(items []db.ShoppingListItem, id string) (*db.ShoppingListItem, bool) {
	for _, item := range items {
		if item.ID == id {
			return &item, true
		}
	}
	return nil, false
}

func (is *ItemService) MoveById(ctx context.Context, itemId string, moveInstr MoveInstructions) error {

	item, err := is.itemRepo.FindById(ctx, itemId)
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
		foundById, ok := findById(items, *moveInstr.AfterId)
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
		// fixme: check if ids.ParentId actually exists
		parentId = moveInstr.ParentId

		var firstItemWithParent *db.ShoppingListItem
		for _, item := range items {
			if item.Parent != nil && *item.Parent == *moveInstr.ParentId {
				firstItemWithParent = &item
				break
			}
		}

		before = firstItemWithParent
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

	return nil
}
