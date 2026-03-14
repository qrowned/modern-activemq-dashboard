package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/activemq-dashboard/backend/internal/models"
	"github.com/activemq-dashboard/backend/internal/services"
)

type QueueHandler struct {
	queueService *services.QueueService
}

func NewQueueHandler(queueService *services.QueueService) *QueueHandler {
	return &QueueHandler{queueService: queueService}
}

func (h *QueueHandler) ListQueues(w http.ResponseWriter, r *http.Request) {
	queues, err := h.queueService.ListQueues()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to list queues", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, queues)
}

func (h *QueueHandler) BrowseMessages(w http.ResponseWriter, r *http.Request) {
	queueName := chi.URLParam(r, "name")
	if queueName == "" {
		writeError(w, http.StatusBadRequest, "Queue name required", "")
		return
	}

	messages, err := h.queueService.BrowseMessages(queueName)
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to browse messages", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, messages)
}

func (h *QueueHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	queueName := chi.URLParam(r, "name")
	if queueName == "" {
		writeError(w, http.StatusBadRequest, "Queue name required", "")
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

	if err := h.queueService.SendMessage(queueName, &req); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to send message", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

func (h *QueueHandler) MoveMessage(w http.ResponseWriter, r *http.Request) {
	queueName := chi.URLParam(r, "name")
	if queueName == "" {
		writeError(w, http.StatusBadRequest, "Queue name required", "")
		return
	}

	var req models.MoveMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	if req.MessageID == "" || req.Destination == "" {
		writeError(w, http.StatusBadRequest, "messageId and destination are required", "")
		return
	}

	if err := h.queueService.MoveMessage(queueName, &req); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to move message", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "moved"})
}

func (h *QueueHandler) PurgeQueue(w http.ResponseWriter, r *http.Request) {
	queueName := chi.URLParam(r, "name")
	if queueName == "" {
		writeError(w, http.StatusBadRequest, "Queue name required", "")
		return
	}

	if err := h.queueService.PurgeQueue(queueName); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to purge queue", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "purged"})
}

func (h *QueueHandler) CreateQueue(w http.ResponseWriter, r *http.Request) {
	var req models.CreateDestinationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		writeError(w, http.StatusBadRequest, "Invalid request", "name is required")
		return
	}
	if err := h.queueService.CreateQueue(req.Name); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create queue", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "created", "name": req.Name})
}

func (h *QueueHandler) RetryMessages(w http.ResponseWriter, r *http.Request) {
	queueName := chi.URLParam(r, "name")
	if queueName == "" {
		writeError(w, http.StatusBadRequest, "Queue name required", "")
		return
	}

	if err := h.queueService.RetryMessages(queueName); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to retry messages", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "retried"})
}
