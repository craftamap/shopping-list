package events

type EventType string

type Event interface {
	GetType() EventType
}

const EventTypeListCreated EventType = "LIST_CREATED"
const EventTypeListUpdated EventType = "LIST_UPDATED"
const EventTypeItemsInListChanged EventType = "ITEMS_IN_LIST_CHANGED"

type ListCreatedEvent struct {
	Type   EventType `json:"type"`
	ListID string    `json:"listID"`
}

func NewListCreatedEvent(listID string) ListCreatedEvent {
	return ListCreatedEvent{
		Type:   EventTypeListCreated,
		ListID: listID,
	}
}

func (lce ListCreatedEvent) GetType() EventType {
	return EventTypeListCreated
}

type ListUpdatedEvent struct {
	Type   EventType `json:"type"`
	ListID string    `json:"listID"`
}

func NewListUpdatedEvent(listID string) ListUpdatedEvent {
	return ListUpdatedEvent{
		Type:   EventTypeListCreated,
		ListID: listID,
	}
}

func (lue ListUpdatedEvent) GetType() EventType {
	return EventTypeListUpdated
}

type ItemsInListChangedEvent struct {
	Type   EventType `json:"type"`
	ListID string    `json:"listID"`
}

func NewItemsInListChangedEvent(listID string) ItemsInListChangedEvent {
	return ItemsInListChangedEvent{
		Type:   EventTypeItemsInListChanged,
		ListID: listID,
	}
}

func (lue ItemsInListChangedEvent) GetType() EventType {
	return EventTypeItemsInListChanged
}
