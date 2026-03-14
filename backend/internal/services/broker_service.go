package services

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/activemq-dashboard/backend/internal/clients"
	"github.com/activemq-dashboard/backend/internal/models"
)

type BrokerService struct {
	jolokia    *clients.JolokiaClient
	brokerName string
}

func NewBrokerService(jolokia *clients.JolokiaClient, brokerName string) *BrokerService {
	return &BrokerService{
		jolokia:    jolokia,
		brokerName: brokerName,
	}
}

func (s *BrokerService) GetBroker() (*models.Broker, error) {
	mbean := fmt.Sprintf("org.apache.activemq:type=Broker,brokerName=%s", s.brokerName)

	attributes := []string{
		"BrokerName",
		"BrokerVersion",
		"Uptime",
		"MemoryPercentUsage",
		"StorePercentUsage",
		"TempPercentUsage",
		"MemoryLimit",
		"StoreLimit",
		"TempLimit",
		"TotalConnectionsCount",
		"TotalConsumerCount",
		"TotalProducerCount",
		"TotalMessageCount",
		"Queues",
	}

	resp, err := s.jolokia.ReadMultiple(mbean, attributes)
	if err != nil {
		return nil, fmt.Errorf("reading broker attributes: %w", err)
	}

	var valueMap map[string]json.RawMessage
	if err := json.Unmarshal(resp.Value, &valueMap); err != nil {
		return nil, fmt.Errorf("parsing broker value: %w", err)
	}

	broker := &models.Broker{}

	if v, ok := valueMap["BrokerName"]; ok {
		json.Unmarshal(v, &broker.Name)
	}
	if v, ok := valueMap["BrokerVersion"]; ok {
		json.Unmarshal(v, &broker.Version)
	}
	if v, ok := valueMap["Uptime"]; ok {
		json.Unmarshal(v, &broker.Uptime)
	}
	if v, ok := valueMap["MemoryPercentUsage"]; ok {
		var memUsage int
		if err := json.Unmarshal(v, &memUsage); err == nil {
			broker.MemoryUsage = float64(memUsage)
		}
	}
	if v, ok := valueMap["StorePercentUsage"]; ok {
		var storeUsage int
		if err := json.Unmarshal(v, &storeUsage); err == nil {
			broker.StoreUsage = float64(storeUsage)
		}
	}
	if v, ok := valueMap["TempPercentUsage"]; ok {
		var tempUsage int
		if err := json.Unmarshal(v, &tempUsage); err == nil {
			broker.TempUsage = float64(tempUsage)
		}
	}
	if v, ok := valueMap["MemoryLimit"]; ok {
		json.Unmarshal(v, &broker.MemoryLimit)
	}
	if v, ok := valueMap["StoreLimit"]; ok {
		json.Unmarshal(v, &broker.StoreLimit)
	}
	if v, ok := valueMap["TempLimit"]; ok {
		json.Unmarshal(v, &broker.TempLimit)
	}
	if v, ok := valueMap["TotalConsumerCount"]; ok {
		json.Unmarshal(v, &broker.TotalConsumers)
	}
	if v, ok := valueMap["TotalProducerCount"]; ok {
		json.Unmarshal(v, &broker.TotalProducers)
	}
	if v, ok := valueMap["TotalMessageCount"]; ok {
		json.Unmarshal(v, &broker.TotalMessages)
	}

	// Count queues from the Queues attribute (array of ObjectName)
	if v, ok := valueMap["Queues"]; ok {
		var queues []interface{}
		if err := json.Unmarshal(v, &queues); err == nil {
			// Filter out internal queues if desired
			count := 0
			for _, q := range queues {
				qStr := fmt.Sprintf("%v", q)
				if !strings.Contains(qStr, "Advisory") {
					count++
				}
			}
			broker.TotalQueues = count
		}
	}

	return broker, nil
}

func (s *BrokerService) Ping() error {
	return s.jolokia.Ping()
}
