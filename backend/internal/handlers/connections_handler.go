package handlers

import (
	"net/http"

	"github.com/activemq-dashboard/backend/internal/services"
)

type ConnectionsHandler struct {
	service *services.ConnectionsService
}

func NewConnectionsHandler(service *services.ConnectionsService) *ConnectionsHandler {
	return &ConnectionsHandler{service: service}
}

func (h *ConnectionsHandler) GetConnectors(w http.ResponseWriter, r *http.Request) {
	connectors, err := h.service.GetConnectors()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to retrieve connectors", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, connectors)
}

func (h *ConnectionsHandler) GetActiveConnections(w http.ResponseWriter, r *http.Request) {
	connections, err := h.service.GetActiveConnections()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to retrieve connections", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, connections)
}
