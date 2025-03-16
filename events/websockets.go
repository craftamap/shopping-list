package events

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"time"

	"log/slog"

	"github.com/coder/websocket"
)

type subscriber struct {
	msgs chan []byte
	//closeSlow?
}

type EventHub struct {
	subscribersMu sync.Mutex
	subscribers   map[*subscriber]bool
}

func New() *EventHub {
	return &EventHub{
		subscribers:   map[*subscriber]bool{},
		subscribersMu: sync.Mutex{},
	}
}

func (eh *EventHub) subscribeWebsocket(ctx context.Context, w http.ResponseWriter, r *http.Request) error {
	sub := &subscriber{
		msgs: make(chan []byte, 16),
	}

	eh.subscribersMu.Lock()
	eh.subscribers[sub] = true
	eh.subscribersMu.Unlock()
	defer func() {
		eh.subscribersMu.Lock()
		delete(eh.subscribers, sub)
		eh.subscribersMu.Unlock()
	}()

	c, err := websocket.Accept(w, r, nil)
	if err != nil {
		return err
	}
	defer c.CloseNow()
	// we dont expect any data from the websocket, as we do unidirectional communication
	ctx = c.CloseRead(ctx)

	for {
		select {
		case msg := <-sub.msgs:
			err := writeTimeout(ctx, time.Second*5, c, msg)
			if err != nil {
				return err
			}
		case <-ctx.Done():
			return ctx.Err()
		}
	}

}

func (eh *EventHub) Publish(event Event) error {
	slog.Info("Publishing event", "event", event)
	msg, err := json.Marshal(event)
	if err != nil {
		return err
	}

	eh.subscribersMu.Lock()
	defer eh.subscribersMu.Unlock()

	for sub := range eh.subscribers {
		select {
		case sub.msgs <- msg:
		default:
			slog.Warn("failed to publish message to subscriber, no space left in buffer")
		}
	}
	return nil
}

func EstablishConnection(hub *EventHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		err := hub.subscribeWebsocket(r.Context(), w, r)
		if errors.Is(err, context.Canceled) {
			return
		}
		if websocket.CloseStatus(err) == websocket.StatusNormalClosure ||
			websocket.CloseStatus(err) == websocket.StatusGoingAway {
			return
		}
		if err != nil {
			slog.Error("error during websocket connection", "err", err)
			return
		}
	}
}

func writeTimeout(ctx context.Context, timeout time.Duration, c *websocket.Conn, msg []byte) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	return c.Write(ctx, websocket.MessageText, msg)
}
