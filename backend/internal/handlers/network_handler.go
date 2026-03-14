package handlers

import (
	"net/http"

	"github.com/activemq-dashboard/backend/internal/services"
)

type NetworkHandler struct {
	service *services.NetworkService
}

func NewNetworkHandler(service *services.NetworkService) *NetworkHandler {
	return &NetworkHandler{service: service}
}

func (h *NetworkHandler) GetNetworkConnectors(w http.ResponseWriter, r *http.Request) {
	connectors, err := h.service.GetNetworkConnectors()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to retrieve network connectors", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, connectors)
}
