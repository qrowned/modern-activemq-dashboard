package handlers

import (
	"net/http"

	"github.com/activemq-dashboard/backend/internal/services"
)

type ScheduledHandler struct {
	service *services.ScheduledService
}

func NewScheduledHandler(service *services.ScheduledService) *ScheduledHandler {
	return &ScheduledHandler{service: service}
}

func (h *ScheduledHandler) GetScheduled(w http.ResponseWriter, r *http.Request) {
	status, err := h.service.GetSchedulerStatus()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to retrieve scheduled messages", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, status)
}
