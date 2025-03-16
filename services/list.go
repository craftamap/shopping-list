package services

import (
	"context"
	"fmt"

	"github.com/craftamap/shopping-list/db"
	"github.com/craftamap/shopping-list/events"
)

type ListService struct {
	listRepo *db.ListRepository
	eventHub *events.EventHub
}

func NewListService(listRepo *db.ListRepository, eventHub *events.EventHub) *ListService {
	return &ListService{
		listRepo: listRepo,
		eventHub: eventHub,
	}
}

func (ls *ListService) GetAll(ctx context.Context) ([]db.ShoppingList, error) {
	lists, err := ls.listRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("Error getting lists: %w", err)
	}
	return lists, nil
}

func (ls *ListService) Create(ctx context.Context) (db.ShoppingList, error) {
	list, err := ls.listRepo.Create(ctx)
	if err != nil {
		return db.ShoppingList{}, fmt.Errorf("Error creating list: %w", err)
	}
	go func() {
		// FIXME: check error response
		_ = ls.eventHub.Publish(events.NewListCreatedEvent(list.ID))
	}()
	return list, nil
}

func (ls *ListService) FindById(ctx context.Context, listId string) (db.ShoppingList, error) {
	list, err := ls.listRepo.FindById(ctx, listId)
	if err != nil {
		return db.ShoppingList{}, fmt.Errorf("Error creating list: %w", err)
	}
	return list, nil
}

func (ls *ListService) Update(ctx context.Context, listId string, status string) (db.ShoppingList, error) {
	_, err := ls.FindById(ctx, listId)
	if err != nil {
		return db.ShoppingList{}, fmt.Errorf("Failed to get list during updating: %w", err)
	}

	err = ls.listRepo.UpdateStatus(ctx, listId, status)
	if err != nil {
		return db.ShoppingList{}, fmt.Errorf("Failed to update list: %w", err)
	}

	list, err := ls.FindById(ctx, listId)
	if err != nil {
		return db.ShoppingList{}, fmt.Errorf("Failed to get list after updating: %w", err)
	}

	go func() {
		// FIXME: check error response
		_ = ls.eventHub.Publish(events.NewListUpdatedEvent(list.ID))
	}()
	return list, nil
}
