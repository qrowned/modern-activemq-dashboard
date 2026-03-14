package services

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/activemq-dashboard/backend/internal/clients"
	"github.com/activemq-dashboard/backend/internal/models"
)

type TopicService struct {
	jolokia    *clients.JolokiaClient
	brokerName string
}

func NewTopicService(jolokia *clients.JolokiaClient, brokerName string) *TopicService {
	return &TopicService{jolokia: jolokia, brokerName: brokerName}
}

func (s *TopicService) topicMBean(name string) string {
	return fmt.Sprintf(
		"org.apache.activemq:type=Broker,brokerName=%s,destinationType=Topic,destinationName=%s",
		s.brokerName, name,
	)
}

func isAdvisory(name string) bool {
	return strings.HasPrefix(name, "ActiveMQ.Advisory")
}

func (s *TopicService) ListTopics() ([]models.Topic, error) {
	brokerMBean := fmt.Sprintf("org.apache.activemq:type=Broker,brokerName=%s", s.brokerName)

	resp, err := s.jolokia.Read(brokerMBean, "Topics")
	if err != nil {
		return nil, fmt.Errorf("listing topics: %w", err)
	}

	var topicObjects []map[string]interface{}
	var topicNames []string

	if err := json.Unmarshal(resp.Value, &topicObjects); err == nil {
		for _, obj := range topicObjects {
			if objName, ok := obj["objectName"].(string); ok {
				name := extractDestinationName(objName)
				if name != "" && !isAdvisory(name) {
					topicNames = append(topicNames, name)
				}
			}
		}
	} else {
		var strTopics []string
		if err := json.Unmarshal(resp.Value, &strTopics); err == nil {
			for _, t := range strTopics {
				name := extractDestinationName(t)
				if name != "" && !isAdvisory(name) {
					topicNames = append(topicNames, name)
				}
			}
		}
	}

	topics := make([]models.Topic, 0, len(topicNames))
	for _, name := range topicNames {
		t, err := s.getTopicAttributes(name)
		if err != nil {
			continue
		}
		topics = append(topics, *t)
	}
	return topics, nil
}

func (s *TopicService) CreateTopic(name string) error {
	mbean := fmt.Sprintf("org.apache.activemq:type=Broker,brokerName=%s", s.brokerName)
	_, err := s.jolokia.Exec(mbean, "addTopic(java.lang.String)", name)
	return err
}

func (s *TopicService) getTopicAttributes(name string) (*models.Topic, error) {
	mbean := s.topicMBean(name)
	attributes := []string{
		"Name",
		"EnqueueCount",
		"DequeueCount",
		"ConsumerCount",
		"ProducerCount",
		"MemoryPercentUsage",
		"DispatchCount",
		"InFlightCount",
	}

	resp, err := s.jolokia.ReadMultiple(mbean, attributes)
	if err != nil {
		return nil, fmt.Errorf("reading topic %s: %w", name, err)
	}

	var valueMap map[string]json.RawMessage
	if err := json.Unmarshal(resp.Value, &valueMap); err != nil {
		return nil, fmt.Errorf("parsing topic value for %s: %w", name, err)
	}

	t := &models.Topic{Name: name}

	if v, ok := valueMap["Name"]; ok {
		json.Unmarshal(v, &t.Name)
	}
	if v, ok := valueMap["EnqueueCount"]; ok {
		json.Unmarshal(v, &t.EnqueueCount)
	}
	if v, ok := valueMap["DequeueCount"]; ok {
		json.Unmarshal(v, &t.DequeueCount)
	}
	if v, ok := valueMap["ConsumerCount"]; ok {
		json.Unmarshal(v, &t.ConsumerCount)
	}
	if v, ok := valueMap["ProducerCount"]; ok {
		json.Unmarshal(v, &t.ProducerCount)
	}
	if v, ok := valueMap["MemoryPercentUsage"]; ok {
		json.Unmarshal(v, &t.MemoryPercentage)
	}
	if v, ok := valueMap["DispatchCount"]; ok {
		json.Unmarshal(v, &t.DispatchCount)
	}
	if v, ok := valueMap["InFlightCount"]; ok {
		json.Unmarshal(v, &t.InFlightCount)
	}

	return t, nil
}
