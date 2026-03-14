package models

type Broker struct {
	Name            string  `json:"name"`
	Version         string  `json:"version"`
	Uptime          string  `json:"uptime"`
	MemoryUsage     float64 `json:"memoryUsage"`
	StoreUsage      float64 `json:"storeUsage"`
	TempUsage       float64 `json:"tempUsage"`
	MemoryLimit     int64   `json:"memoryLimit"`
	StoreLimit      int64   `json:"storeLimit"`
	TempLimit       int64   `json:"tempLimit"`
	TotalQueues     int     `json:"totalQueues"`
	TotalConsumers  int     `json:"totalConsumers"`
	TotalProducers  int     `json:"totalProducers"`
	TotalMessages   int64   `json:"totalMessages"`
}

type Topic struct {
	Name             string  `json:"name"`
	EnqueueCount     int64   `json:"enqueueCount"`
	DequeueCount     int64   `json:"dequeueCount"`
	ConsumerCount    int     `json:"consumerCount"`
	ProducerCount    int     `json:"producerCount"`
	MemoryPercentage float64 `json:"memoryPercentage"`
	DispatchCount    int64   `json:"dispatchCount"`
	InFlightCount    int64   `json:"inFlightCount"`
}

type Queue struct {
	Name             string  `json:"name"`
	QueueSize        int64   `json:"queueSize"`
	EnqueueCount     int64   `json:"enqueueCount"`
	DequeueCount     int64   `json:"dequeueCount"`
	ConsumerCount    int     `json:"consumerCount"`
	ProducerCount    int     `json:"producerCount"`
	MemoryUsage      float64 `json:"memoryUsage"`
	MemoryPercentage float64 `json:"memoryPercentage"`
	DLQ              bool    `json:"dlq"`
}

type Message struct {
	MessageID   string            `json:"messageId"`
	Body        string            `json:"body"`
	Properties  map[string]string `json:"properties"`
	Timestamp   int64             `json:"timestamp"`
	Destination string            `json:"destination"`
	Type        string            `json:"type"`
}

type SendMessageRequest struct {
	Body       string            `json:"body"`
	Properties map[string]string `json:"properties,omitempty"`
	Type       string            `json:"type,omitempty"`

	// Message header & scheduling (optional, for persistent/scheduled messages)
	CorrelationID   string `json:"correlationId,omitempty"`
	ReplyTo         string `json:"replyTo,omitempty"`
	MessageType     string `json:"messageType,omitempty"`
	MessageGroup    string `json:"messageGroup,omitempty"`
	GroupSeq        *int   `json:"groupSeq,omitempty"`
	Persistent      *bool  `json:"persistent,omitempty"`
	Priority        *int   `json:"priority,omitempty"`
	TimeToLive      *int64 `json:"timeToLive,omitempty"`       // milliseconds
	ScheduledDelay  *int64 `json:"scheduledDelay,omitempty"`   // delay(ms) before first delivery
	ScheduledPeriod *int64 `json:"scheduledPeriod,omitempty"` // ms between repeated deliveries
	ScheduledRepeat *int   `json:"scheduledRepeat,omitempty"`  // number of repeats
	ScheduledCron   string `json:"scheduledCron,omitempty"`   // cron expression
	CounterHeader   string `json:"counterHeader,omitempty"`   // e.g. JMSXMessageCounter
	NumMessages     *int   `json:"numMessages,omitempty"`     // number of messages to send (default 1)
}

type MoveMessageRequest struct {
	MessageID   string `json:"messageId"`
	Destination string `json:"destination"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

type CreateDestinationRequest struct {
	Name string `json:"name"`
}

type TransportConnector struct {
	Name           string `json:"name"`
	URI            string `json:"uri"`
	Started        bool   `json:"started"`
	Connections    int    `json:"connections"`
	MaxConnections int    `json:"maxConnections"`
}

type Connection struct {
	ConnectionName    string `json:"connectionName"`
	ConnectorName     string `json:"connectorName"`
	RemoteAddress     string `json:"remoteAddress"`
	Username          string `json:"username"`
	SlowConsumer      bool   `json:"slowConsumer"`
	Subscriptions     int    `json:"subscriptions"`
	DispatchQueueSize int    `json:"dispatchQueueSize"`
	ClientID          string `json:"clientId"`
}

type NetworkConnector struct {
	Name                   string `json:"name"`
	URI                    string `json:"uri"`
	Started                bool   `json:"started"`
	BridgeTempDestinations bool   `json:"bridgeTempDestinations"`
	Duplex                 bool   `json:"duplex"`
}

type ScheduledMessage struct {
	JobID     string `json:"jobId"`
	Next      string `json:"next"`
	Start     string `json:"start"`
	Delay     int64  `json:"delay"`
	Period    int64  `json:"period"`
	Repeat    int    `json:"repeat"`
	CronEntry string `json:"cronEntry"`
}

type SchedulerStatus struct {
	Enabled    bool               `json:"enabled"`
	StoreUsage float64            `json:"storeUsage"`
	StoreLimit int64              `json:"storeLimit"`
	Jobs       []ScheduledMessage `json:"jobs"`
}
