package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/activemq-dashboard/backend/internal/models"
	"github.com/activemq-dashboard/backend/internal/services"
	"github.com/go-chi/chi/v5"
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

func (h *TopicHandler) DeleteTopic(w http.ResponseWriter, r *http.Request) {
	topicName := chi.URLParam(r, "name")
	if topicName == "" {
		writeError(w, http.StatusBadRequest, "Topic name required", "")
		return
	}
	if err := h.service.DeleteTopic(topicName); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to delete topic", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *TopicHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	topicName := chi.URLParam(r, "name")
	if topicName == "" {
		writeError(w, http.StatusBadRequest, "Topic name required", "")
		return
	}
	var req models.SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}
	if req.Body == "" {
		writeError(w, http.StatusBadRequest, "Message body is required", "")
		return
	}
	if err := h.service.SendMessage(topicName, &req); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to send message", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}
