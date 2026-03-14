package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/activemq-dashboard/backend/internal/clients"
	"github.com/activemq-dashboard/backend/internal/config"
	"github.com/activemq-dashboard/backend/internal/handlers"
	"github.com/activemq-dashboard/backend/internal/services"
)

func main() {
	cfg := config.Load()

	jolokiaClient := clients.NewJolokiaClient(
		cfg.ActiveMQURL,
		cfg.ActiveMQUser,
		cfg.ActiveMQPassword,
	)
	restClient := clients.NewActiveMQRESTClient(
		cfg.ActiveMQURL,
		cfg.ActiveMQUser,
		cfg.ActiveMQPassword,
	)

	brokerService := services.NewBrokerService(jolokiaClient, cfg.BrokerName)
	queueService := services.NewQueueService(jolokiaClient, cfg.BrokerName, restClient)
	topicService := services.NewTopicService(jolokiaClient, cfg.BrokerName, restClient)
	connectionsService := services.NewConnectionsService(jolokiaClient, cfg.BrokerName)
	networkService := services.NewNetworkService(jolokiaClient, cfg.BrokerName)
	scheduledService := services.NewScheduledService(jolokiaClient, cfg.BrokerName)

	brokerHandler := handlers.NewBrokerHandler(brokerService)
	queueHandler := handlers.NewQueueHandler(queueService)
	topicHandler := handlers.NewTopicHandler(topicService)
	connectionsHandler := handlers.NewConnectionsHandler(connectionsService)
	networkHandler := handlers.NewNetworkHandler(networkService)
	scheduledHandler := handlers.NewScheduledHandler(scheduledService)

	router := handlers.NewRouter(brokerHandler, queueHandler, topicHandler, connectionsHandler, networkHandler, scheduledHandler)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Starting ActiveMQ Dashboard backend on %s", addr)
	log.Printf("Connecting to ActiveMQ at %s", cfg.ActiveMQURL)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
