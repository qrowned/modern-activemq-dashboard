package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
)

func NewRouter(brokerHandler *BrokerHandler, queueHandler *QueueHandler, topicHandler *TopicHandler, connectionsHandler *ConnectionsHandler, networkHandler *NetworkHandler, scheduledHandler *ScheduledHandler) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)

	corsMiddleware := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	})
	r.Use(corsMiddleware.Handler)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", brokerHandler.Health)
		r.Get("/brokers", brokerHandler.GetBrokers)

		r.Get("/queues", queueHandler.ListQueues)
		r.Post("/queues", queueHandler.CreateQueue)
		r.Get("/queues/{name}/messages", queueHandler.BrowseMessages)
		r.Post("/queues/{name}/send", queueHandler.SendMessage)
		r.Post("/queues/{name}/move", queueHandler.MoveMessage)
		r.Post("/queues/{name}/retry", queueHandler.RetryMessages)
		r.Post("/queues/{name}/purge", queueHandler.PurgeQueue)

		r.Get("/topics", topicHandler.ListTopics)
		r.Post("/topics", topicHandler.CreateTopic)

		r.Get("/connections", connectionsHandler.GetConnectors)
		r.Get("/connections/active", connectionsHandler.GetActiveConnections)

		r.Get("/network", networkHandler.GetNetworkConnectors)

		r.Get("/scheduled", scheduledHandler.GetScheduled)
	})

	return r
}
