package services

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/activemq-dashboard/backend/internal/clients"
	"github.com/activemq-dashboard/backend/internal/models"
)

type ConnectionsService struct {
	jolokia    *clients.JolokiaClient
	brokerName string
}

func NewConnectionsService(jolokia *clients.JolokiaClient, brokerName string) *ConnectionsService {
	return &ConnectionsService{jolokia: jolokia, brokerName: brokerName}
}

func (s *ConnectionsService) GetConnectors() ([]models.TransportConnector, error) {
	brokerMBean := fmt.Sprintf("org.apache.activemq:type=Broker,brokerName=%s", s.brokerName)

	resp, err := s.jolokia.Read(brokerMBean, "TransportConnectors")
	if err != nil {
		return nil, fmt.Errorf("reading transport connectors: %w", err)
	}

	var uriMap map[string]string
	if err := json.Unmarshal(resp.Value, &uriMap); err != nil {
		return nil, fmt.Errorf("parsing transport connectors: %w", err)
	}

	maxConnRe := regexp.MustCompile(`maximumConnections=(\d+)`)

	connectors := make([]models.TransportConnector, 0, len(uriMap))
	for name, uri := range uriMap {
		maxConn := 1000
		if m := maxConnRe.FindStringSubmatch(uri); len(m) == 2 {
			if n, err := strconv.Atoi(m[1]); err == nil {
				maxConn = n
			}
		}

		// Read connector MBean for started status
		connMBean := fmt.Sprintf(
			"org.apache.activemq:type=Broker,brokerName=%s,connector=clientConnectors,connectorName=%s",
			s.brokerName, name,
		)
		started := true
		if connResp, err := s.jolokia.Read(connMBean, "Started"); err == nil {
			var val bool
			if json.Unmarshal(connResp.Value, &val) == nil {
				started = val
			}
		}

		connectors = append(connectors, models.TransportConnector{
			Name:           name,
			URI:            uri,
			Started:        started,
			MaxConnections: maxConn,
		})
	}

	return connectors, nil
}

func (s *ConnectionsService) GetActiveConnections() ([]models.Connection, error) {
	// Search for individual client connection MBeans
	searchResp, err := s.jolokia.Search(
		fmt.Sprintf("org.apache.activemq:type=Broker,brokerName=%s,connectionViewType=clientId,*", s.brokerName),
	)
	if err != nil || len(searchResp) == 0 {
		return []models.Connection{}, nil
	}

	connections := make([]models.Connection, 0, len(searchResp))
	for _, mbean := range searchResp {
		attributes := []string{"RemoteAddress", "UserName", "SlowConsumer", "DispatchQueueSize", "Subscriptions"}
		resp, err := s.jolokia.ReadMultiple(mbean, attributes)
		if err != nil {
			continue
		}

		var valueMap map[string]json.RawMessage
		if err := json.Unmarshal(resp.Value, &valueMap); err != nil {
			continue
		}

		conn := models.Connection{
			ConnectionName: extractDestinationName(mbean),
		}
		// Extract connectorName and connectionName from MBean path
		parts := splitMBeanProperties(mbean)
		if cn, ok := parts["connectorName"]; ok {
			conn.ConnectorName = cn
		}
		if cn, ok := parts["connectionName"]; ok {
			conn.ConnectionName = cn
		}

		if v, ok := valueMap["RemoteAddress"]; ok {
			json.Unmarshal(v, &conn.RemoteAddress)
		}
		if v, ok := valueMap["UserName"]; ok {
			json.Unmarshal(v, &conn.Username)
		}
		if v, ok := valueMap["SlowConsumer"]; ok {
			json.Unmarshal(v, &conn.SlowConsumer)
		}
		if v, ok := valueMap["DispatchQueueSize"]; ok {
			json.Unmarshal(v, &conn.DispatchQueueSize)
		}

		connections = append(connections, conn)
	}

	return connections, nil
}

func splitMBeanProperties(mbean string) map[string]string {
	result := make(map[string]string)
	// Find properties part after the colon
	colonIdx := -1
	for i, c := range mbean {
		if c == ':' {
			colonIdx = i
			break
		}
	}
	if colonIdx < 0 {
		return result
	}
	props := mbean[colonIdx+1:]
	for _, pair := range splitRespectingQuotes(props, ',') {
		kv := splitRespectingQuotes(pair, '=')
		if len(kv) == 2 {
			result[strings.TrimSpace(kv[0])] = strings.TrimSpace(kv[1])
		}
	}
	return result
}

func splitRespectingQuotes(s string, sep rune) []string {
	var parts []string
	var current []rune
	inQuotes := false
	for _, c := range s {
		switch {
		case c == '"':
			inQuotes = !inQuotes
		case c == sep && !inQuotes:
			parts = append(parts, string(current))
			current = current[:0]
			continue
		}
		current = append(current, c)
	}
	if len(current) > 0 {
		parts = append(parts, string(current))
	}
	return parts
}
