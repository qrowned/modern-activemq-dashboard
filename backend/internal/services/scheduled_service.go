package services

import (
	"encoding/json"
	"fmt"

	"github.com/activemq-dashboard/backend/internal/clients"
	"github.com/activemq-dashboard/backend/internal/models"
)

type ScheduledService struct {
	jolokia    *clients.JolokiaClient
	brokerName string
}

func NewScheduledService(jolokia *clients.JolokiaClient, brokerName string) *ScheduledService {
	return &ScheduledService{jolokia: jolokia, brokerName: brokerName}
}

func (s *ScheduledService) GetSchedulerStatus() (*models.SchedulerStatus, error) {
	brokerMBean := fmt.Sprintf("org.apache.activemq:type=Broker,brokerName=%s", s.brokerName)

	resp, err := s.jolokia.ReadMultiple(brokerMBean, []string{
		"JMSJobScheduler",
		"JobSchedulerStoreLimit",
		"JobSchedulerStorePercentUsage",
	})
	if err != nil {
		return nil, fmt.Errorf("reading scheduler status: %w", err)
	}

	var valueMap map[string]json.RawMessage
	if err := json.Unmarshal(resp.Value, &valueMap); err != nil {
		return nil, fmt.Errorf("parsing scheduler status: %w", err)
	}

	status := &models.SchedulerStatus{Jobs: []models.ScheduledMessage{}}

	// JMSJobScheduler is null (JSON null) when disabled, or {"objectName":"..."} when enabled.
	if v, ok := valueMap["JMSJobScheduler"]; ok {
		var raw map[string]interface{}
		if json.Unmarshal(v, &raw) == nil && raw != nil {
			status.Enabled = true
		}
	}

	if v, ok := valueMap["JobSchedulerStoreLimit"]; ok {
		json.Unmarshal(v, &status.StoreLimit)
	}
	if v, ok := valueMap["JobSchedulerStorePercentUsage"]; ok {
		json.Unmarshal(v, &status.StoreUsage)
	}

	if !status.Enabled {
		return status, nil
	}

	// Find the JobScheduler MBean
	pattern := fmt.Sprintf(
		"org.apache.activemq:type=Broker,brokerName=%s,service=JobScheduler,*",
		s.brokerName,
	)
	mbeans, err := s.jolokia.Search(pattern)
	if err != nil || len(mbeans) == 0 {
		return status, nil
	}
	schedulerMBean := mbeans[0]

	// Read AllJobs — returns map[jobId]→{next, start, delay, period, repeat, cronEntry, jobId}
	// Note: AllJobs TabularData schema does NOT include destination (ActiveMQ JMX limitation).
	jobResp, err := s.jolokia.Read(schedulerMBean, "AllJobs")
	if err != nil {
		return status, nil
	}

	// AllJobs is a map keyed by jobId
	var allJobs map[string]map[string]interface{}
	if err := json.Unmarshal(jobResp.Value, &allJobs); err != nil {
		return status, nil
	}

	for _, job := range allJobs {
		sj := models.ScheduledMessage{}

		if v, ok := job["jobId"].(string); ok {
			sj.JobID = v
		}
		if v, ok := job["next"].(string); ok {
			sj.Next = v
		}
		if v, ok := job["start"].(string); ok {
			sj.Start = v
		}
		if v, ok := job["cronEntry"].(string); ok {
			sj.CronEntry = v
		}
		if v, ok := job["delay"].(float64); ok {
			sj.Delay = int64(v)
		}
		if v, ok := job["period"].(float64); ok {
			sj.Period = int64(v)
		}
		if v, ok := job["repeat"].(float64); ok {
			sj.Repeat = int(v)
		}

		status.Jobs = append(status.Jobs, sj)
	}

	return status, nil
}
