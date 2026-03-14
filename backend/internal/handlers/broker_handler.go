package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/activemq-dashboard/backend/internal/models"
	"github.com/activemq-dashboard/backend/internal/services"
)

type BrokerHandler struct {
	brokerService *services.BrokerService
}

func NewBrokerHandler(brokerService *services.BrokerService) *BrokerHandler {
	return &BrokerHandler{brokerService: brokerService}
}

func (h *BrokerHandler) GetBrokers(w http.ResponseWriter, r *http.Request) {
	broker, err := h.brokerService.GetBroker()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Failed to retrieve broker info", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, []*models.Broker{broker})
}

func (h *BrokerHandler) Health(w http.ResponseWriter, r *http.Request) {
	err := h.brokerService.Ping()
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "unhealthy",
			"error":  err.Error(),
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "healthy",
	})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, errMsg, detail string) {
	writeJSON(w, status, models.ErrorResponse{
		Error:   errMsg,
		Message: detail,
	})
}
