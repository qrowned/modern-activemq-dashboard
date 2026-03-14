package services

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/activemq-dashboard/backend/internal/clients"
	"github.com/activemq-dashboard/backend/internal/models"
)

type NetworkService struct {
	jolokia    *clients.JolokiaClient
	brokerName string
}

func NewNetworkService(jolokia *clients.JolokiaClient, brokerName string) *NetworkService {
	return &NetworkService{jolokia: jolokia, brokerName: brokerName}
}

func (s *NetworkService) GetNetworkConnectors() ([]models.NetworkConnector, error) {
	pattern := fmt.Sprintf(
		"org.apache.activemq:type=Broker,brokerName=%s,connector=networkConnectors,*",
		s.brokerName,
	)

	mbeans, err := s.jolokia.Search(pattern)
	if err != nil || len(mbeans) == 0 {
		return []models.NetworkConnector{}, nil
	}

	connectors := make([]models.NetworkConnector, 0, len(mbeans))
	for _, mbean := range mbeans {
		attrs := []string{"Name", "URI", "Started", "BridgeTempDestinations", "Duplex"}
		resp, err := s.jolokia.ReadMultiple(mbean, attrs)
		if err != nil {
			continue
		}

		var valueMap map[string]json.RawMessage
		if err := json.Unmarshal(resp.Value, &valueMap); err != nil {
			continue
		}

		nc := models.NetworkConnector{}
		if v, ok := valueMap["Name"]; ok {
			json.Unmarshal(v, &nc.Name)
		}
		if v, ok := valueMap["URI"]; ok {
			json.Unmarshal(v, &nc.URI)
		}
		if v, ok := valueMap["Started"]; ok {
			json.Unmarshal(v, &nc.Started)
		}
		if v, ok := valueMap["BridgeTempDestinations"]; ok {
			json.Unmarshal(v, &nc.BridgeTempDestinations)
		}
		if v, ok := valueMap["Duplex"]; ok {
			json.Unmarshal(v, &nc.Duplex)
		}

		// Fallback: extract name from MBean
		if nc.Name == "" {
			parts := strings.Split(mbean, "connectorName=")
			if len(parts) > 1 {
				nc.Name = strings.Split(parts[1], ",")[0]
			}
		}

		connectors = append(connectors, nc)
	}

	return connectors, nil
}
