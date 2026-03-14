package services

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/activemq-dashboard/backend/internal/clients"
	"github.com/activemq-dashboard/backend/internal/models"
)

type QueueService struct {
	jolokia    *clients.JolokiaClient
	rest       *clients.ActiveMQRESTClient
	brokerName string
}

func NewQueueService(jolokia *clients.JolokiaClient, brokerName string, rest *clients.ActiveMQRESTClient) *QueueService {
	return &QueueService{
		jolokia:    jolokia,
		rest:       rest,
		brokerName: brokerName,
	}
}

func (s *QueueService) queueMBean(queueName string) string {
	return fmt.Sprintf(
		"org.apache.activemq:type=Broker,brokerName=%s,destinationType=Queue,destinationName=%s",
		s.brokerName,
		queueName,
	)
}

func (s *QueueService) brokerMBean() string {
	return fmt.Sprintf("org.apache.activemq:type=Broker,brokerName=%s", s.brokerName)
}

func isDLQ(name string) bool {
	return strings.HasPrefix(name, "DLQ.") ||
		strings.HasPrefix(name, "ActiveMQ.DLQ") ||
		name == "DLQ"
}

func (s *QueueService) ListQueues() ([]models.Queue, error) {
	// First get the list of queue ObjectNames from the broker
	brokerMBean := s.brokerMBean()
	resp, err := s.jolokia.Read(brokerMBean, "Queues")
	if err != nil {
		return nil, fmt.Errorf("listing queues: %w", err)
	}

	// Value is an array of ObjectName objects or strings
	var rawQueues json.RawMessage
	rawQueues = resp.Value

	// Try as array of objects with "objectName" field
	var queueObjects []map[string]interface{}
	var queueNames []string

	if err := json.Unmarshal(rawQueues, &queueObjects); err == nil {
		for _, obj := range queueObjects {
			if objName, ok := obj["objectName"].(string); ok {
				name := extractDestinationName(objName)
				if name != "" && !strings.Contains(name, "Advisory") {
					queueNames = append(queueNames, name)
				}
			}
		}
	} else {
		// Try as array of strings
		var strQueues []string
		if err := json.Unmarshal(rawQueues, &strQueues); err == nil {
			for _, q := range strQueues {
				name := extractDestinationName(q)
				if name != "" && !strings.Contains(name, "Advisory") {
					queueNames = append(queueNames, name)
				}
			}
		}
	}

	queues := make([]models.Queue, 0, len(queueNames))
	for _, name := range queueNames {
		q, err := s.getQueueAttributes(name)
		if err != nil {
			// Log and continue - don't fail the whole list for one queue
			continue
		}
		queues = append(queues, *q)
	}

	return queues, nil
}

func extractDestinationName(objectName string) string {
	// Parse "org.apache.activemq:type=Broker,...,destinationName=SomeName"
	parts := strings.Split(objectName, ",")
	for _, part := range parts {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) == 2 && strings.TrimSpace(kv[0]) == "destinationName" {
			return strings.TrimSpace(kv[1])
		}
	}
	return ""
}

func (s *QueueService) getQueueAttributes(name string) (*models.Queue, error) {
	mbean := s.queueMBean(name)
	attributes := []string{
		"Name",
		"QueueSize",
		"EnqueueCount",
		"DequeueCount",
		"ConsumerCount",
		"ProducerCount",
		"MemoryUsageByteCount",
		"MemoryPercentUsage",
	}

	resp, err := s.jolokia.ReadMultiple(mbean, attributes)
	if err != nil {
		return nil, fmt.Errorf("reading queue %s: %w", name, err)
	}

	var valueMap map[string]json.RawMessage
	if err := json.Unmarshal(resp.Value, &valueMap); err != nil {
		return nil, fmt.Errorf("parsing queue value for %s: %w", name, err)
	}

	q := &models.Queue{
		Name: name,
		DLQ:  isDLQ(name),
	}

	if v, ok := valueMap["Name"]; ok {
		json.Unmarshal(v, &q.Name)
	}
	if v, ok := valueMap["QueueSize"]; ok {
		json.Unmarshal(v, &q.QueueSize)
	}
	if v, ok := valueMap["EnqueueCount"]; ok {
		json.Unmarshal(v, &q.EnqueueCount)
	}
	if v, ok := valueMap["DequeueCount"]; ok {
		json.Unmarshal(v, &q.DequeueCount)
	}
	if v, ok := valueMap["ConsumerCount"]; ok {
		json.Unmarshal(v, &q.ConsumerCount)
	}
	if v, ok := valueMap["ProducerCount"]; ok {
		json.Unmarshal(v, &q.ProducerCount)
	}
	if v, ok := valueMap["MemoryUsageByteCount"]; ok {
		json.Unmarshal(v, &q.MemoryUsage)
	}
	if v, ok := valueMap["MemoryPercentUsage"]; ok {
		json.Unmarshal(v, &q.MemoryPercentage)
	}

	return q, nil
}

func (s *QueueService) BrowseMessages(queueName string) ([]models.Message, error) {
	mbean := s.queueMBean(queueName)

	resp, err := s.jolokia.Exec(mbean, "browse()")
	if err != nil {
		return nil, fmt.Errorf("browsing messages in %s: %w", queueName, err)
	}

	// Value is an array of CompositeData objects
	var rawMessages json.RawMessage = resp.Value
	var compositeMessages []map[string]interface{}

	if err := json.Unmarshal(rawMessages, &compositeMessages); err != nil {
		// Try single item
		var single map[string]interface{}
		if err2 := json.Unmarshal(rawMessages, &single); err2 != nil {
			return []models.Message{}, nil
		}
		compositeMessages = []map[string]interface{}{single}
	}

	messages := make([]models.Message, 0, len(compositeMessages))
	for _, cm := range compositeMessages {
		msg := parseCompositeMessage(cm, queueName)
		messages = append(messages, msg)
	}

	return messages, nil
}

func parseCompositeMessage(cm map[string]interface{}, destination string) models.Message {
	msg := models.Message{
		Properties:  make(map[string]string),
		Destination: destination,
		Type:        "TextMessage",
	}

	if v, ok := cm["JMSMessageID"].(string); ok {
		msg.MessageID = v
	}
	if v, ok := cm["Text"].(string); ok {
		msg.Body = v
	}
	if v, ok := cm["JMSTimestamp"]; ok {
		switch ts := v.(type) {
		case float64:
			msg.Timestamp = int64(ts)
		case int64:
			msg.Timestamp = ts
		}
	}
	if v, ok := cm["JMSType"].(string); ok && v != "" {
		msg.Type = v
	}

	// Extract string properties
	if props, ok := cm["StringProperties"].(map[string]interface{}); ok {
		for k, val := range props {
			if strVal, ok := val.(string); ok {
				msg.Properties[k] = strVal
			} else {
				msg.Properties[k] = fmt.Sprintf("%v", val)
			}
		}
	}

	// Also check UserProperties
	if props, ok := cm["UserProperties"].(map[string]interface{}); ok {
		for k, val := range props {
			if val != nil {
				msg.Properties[k] = fmt.Sprintf("%v", val)
			}
		}
	}

	return msg
}

func (s *QueueService) SendMessage(queueName string, req *models.SendMessageRequest) error {
	numMessages := 1
	if req.NumMessages != nil && *req.NumMessages > 1 {
		numMessages = *req.NumMessages
	}

	useREST := s.rest != nil && s.hasSendOptions(req)
	if useREST {
		for i := 0; i < numMessages; i++ {
			if err := s.rest.SendMessage(queueName, req); err != nil {
				return fmt.Errorf("REST send: %w", err)
			}
		}
		return nil
	}

	// Fallback: Jolokia (no headers/scheduling support)
	mbean := s.queueMBean(queueName)
	for i := 0; i < numMessages; i++ {
		if req.Type == "bytes" {
			_, err := s.jolokia.Exec(mbean, "sendBytesMessage(byte[])", []byte(req.Body))
			if err != nil {
				return err
			}
			continue
		}
		_, err := s.jolokia.Exec(mbean, "sendTextMessage(java.lang.String)", req.Body)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *QueueService) hasSendOptions(req *models.SendMessageRequest) bool {
	return req.CorrelationID != "" || req.ReplyTo != "" || req.MessageType != "" ||
		req.MessageGroup != "" || req.GroupSeq != nil || req.Persistent != nil ||
		req.Priority != nil || req.TimeToLive != nil || req.ScheduledDelay != nil ||
		req.ScheduledPeriod != nil || req.ScheduledRepeat != nil || req.ScheduledCron != "" ||
		req.CounterHeader != "" || len(req.Properties) > 0
}

func (s *QueueService) MoveMessage(queueName string, req *models.MoveMessageRequest) error {
	mbean := s.queueMBean(queueName)
	_, err := s.jolokia.Exec(mbean, "moveMessageTo(java.lang.String,java.lang.String)", req.MessageID, req.Destination)
	return err
}

func (s *QueueService) PurgeQueue(queueName string) error {
	mbean := s.queueMBean(queueName)
	_, err := s.jolokia.Exec(mbean, "purge()")
	return err
}

func (s *QueueService) CreateQueue(name string) error {
	mbean := fmt.Sprintf("org.apache.activemq:type=Broker,brokerName=%s", s.brokerName)
	_, err := s.jolokia.Exec(mbean, "addQueue(java.lang.String)", name)
	return err
}

func (s *QueueService) RetryMessages(queueName string) error {
	// For a DLQ, move all messages to the original queue
	// Strip DLQ. prefix to get original queue name
	originalQueue := queueName
	if strings.HasPrefix(queueName, "DLQ.") {
		originalQueue = strings.TrimPrefix(queueName, "DLQ.")
	} else if strings.HasPrefix(queueName, "ActiveMQ.DLQ.") {
		originalQueue = strings.TrimPrefix(queueName, "ActiveMQ.DLQ.")
	}

	messages, err := s.BrowseMessages(queueName)
	if err != nil {
		return fmt.Errorf("browsing DLQ messages: %w", err)
	}

	mbean := s.queueMBean(queueName)
	var lastErr error
	for _, msg := range messages {
		if msg.MessageID == "" {
			continue
		}
		_, err := s.jolokia.Exec(mbean, "moveMessageTo(java.lang.String,java.lang.String)", msg.MessageID, originalQueue)
		if err != nil {
			lastErr = err
		}
	}

	return lastErr
}
