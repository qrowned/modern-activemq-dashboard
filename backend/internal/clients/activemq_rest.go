package clients

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/activemq-dashboard/backend/internal/models"
)

// ActiveMQRESTClient sends messages via ActiveMQ Classic REST API so JMS headers
// and scheduling properties are applied (persistent, TTL, delay, cron, etc.).
type ActiveMQRESTClient struct {
	baseURL    string
	username   string
	password   string
	httpClient *http.Client
}

func NewActiveMQRESTClient(baseURL, username, password string) *ActiveMQRESTClient {
	return &ActiveMQRESTClient{
		baseURL:  strings.TrimSuffix(baseURL, "/"),
		username: username,
		password: password,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SendMessage POSTs to the broker REST API with body and optional JMS/scheduling params.
func (c *ActiveMQRESTClient) SendMessage(queueName string, req *models.SendMessageRequest) error {
	u, err := url.Parse(fmt.Sprintf("%s/api/message/%s", c.baseURL, url.PathEscape(queueName)))
	if err != nil {
		return fmt.Errorf("build send URL: %w", err)
	}

	q := u.Query()
	q.Set("type", "queue")

	// JMS headers as query params (supported by ActiveMQ REST)
	if req.CorrelationID != "" {
		q.Set("JMSCorrelationID", req.CorrelationID)
	}
	if req.ReplyTo != "" {
		q.Set("JMSReplyTo", req.ReplyTo)
	}
	if req.MessageType != "" {
		q.Set("JMSType", req.MessageType)
	}
	if req.Priority != nil {
		q.Set("JMSPriority", strconv.Itoa(*req.Priority))
	}
	if req.TimeToLive != nil && *req.TimeToLive > 0 {
		q.Set("JMSTimeToLive", strconv.FormatInt(*req.TimeToLive, 10))
	}
	if req.Persistent != nil {
		if *req.Persistent {
			q.Set("JMSDeliveryMode", "PERSISTENT")
		} else {
			q.Set("JMSDeliveryMode", "NON_PERSISTENT")
		}
	}

	u.RawQuery = q.Encode()

	form := url.Values{}
	form.Set("body", req.Body)

	// Delivery mode in form body too (some servlet configs read POST body only)
	if req.Persistent != nil {
		if *req.Persistent {
			form.Set("JMSDeliveryMode", "PERSISTENT")
		} else {
			form.Set("JMSDeliveryMode", "NON_PERSISTENT")
		}
	}

	// Message group (JMSXGroupID, JMSXGroupSeq)
	if req.MessageGroup != "" {
		form.Set("JMSXGroupID", req.MessageGroup)
	}
	if req.GroupSeq != nil {
		form.Set("JMSXGroupSeq", strconv.Itoa(*req.GroupSeq))
	}

	// ActiveMQ scheduled message properties (message properties)
	if req.ScheduledDelay != nil && *req.ScheduledDelay > 0 {
		form.Set("AMQ_SCHEDULED_DELAY", strconv.FormatInt(*req.ScheduledDelay, 10))
	}
	if req.ScheduledPeriod != nil && *req.ScheduledPeriod > 0 {
		form.Set("AMQ_SCHEDULED_PERIOD", strconv.FormatInt(*req.ScheduledPeriod, 10))
	}
	if req.ScheduledRepeat != nil && *req.ScheduledRepeat > 0 {
		form.Set("AMQ_SCHEDULED_REPEAT", strconv.Itoa(*req.ScheduledRepeat))
	}
	if req.ScheduledCron != "" {
		form.Set("AMQ_SCHEDULED_CRON", req.ScheduledCron)
	}
	if req.CounterHeader != "" {
		form.Set("counterHeader", req.CounterHeader)
	}

	// Custom properties
	for k, v := range req.Properties {
		if k != "" {
			form.Set(k, v)
		}
	}

	httpReq, err := http.NewRequest(http.MethodPost, u.String(), strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	httpReq.SetBasicAuth(c.username, c.password)
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Set("Origin", c.baseURL)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("REST send failed (status %d): %s", resp.StatusCode, bytes.TrimSpace(body))
	}

	return nil
}
