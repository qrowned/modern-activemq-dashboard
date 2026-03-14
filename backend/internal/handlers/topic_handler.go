package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/activemq-dashboard/backend/internal/models"
	"github.com/activemq-dashboard/backend/internal/services"
)

type TopicHandler struct {
	service *services.TopicService
}

func NewTopicHandler(service *services.TopicService) *TopicHandler {
	return &TopicHandler{service: service}
}

func (h *TopicHandler) ListTopics(w http.ResponseWriter, r *http.Request) {
	topics, err := h.service.ListTopics()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to retrieve topics", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, topics)
}

func (h *TopicHandler) CreateTopic(w http.ResponseWriter, r *http.Request) {
	var req models.CreateDestinationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		writeError(w, http.StatusBadRequest, "Invalid request", "name is required")
		return
	}
	if err := h.service.CreateTopic(req.Name); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create topic", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "created", "name": req.Name})
}
