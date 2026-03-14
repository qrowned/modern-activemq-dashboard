const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export interface Broker {
  name: string
  version: string
  uptime: string
  memoryUsage: number
  storeUsage: number
  tempUsage: number
  memoryLimit: number
  storeLimit: number
  tempLimit: number
  totalQueues: number
  totalConsumers: number
  totalProducers: number
  totalMessages: number
}

export interface Topic {
  name: string
  enqueueCount: number
  dequeueCount: number
  consumerCount: number
  producerCount: number
  memoryPercentage: number
  dispatchCount: number
  inFlightCount: number
}

export interface Queue {
  name: string
  queueSize: number
  enqueueCount: number
  dequeueCount: number
  consumerCount: number
  producerCount: number
  memoryUsage: number
  memoryPercentage: number
  dlq: boolean
}

export interface Message {
  messageId: string
  body: string
  properties: Record<string, string>
  timestamp: number
  destination: string
  type: string
}

export interface SendMessageRequest {
  body: string
  properties?: Record<string, string>
  type?: string
  // Message header & scheduling (optional)
  correlationId?: string
  replyTo?: string
  messageType?: string
  messageGroup?: string
  groupSeq?: number
  persistent?: boolean
  priority?: number
  timeToLive?: number
  scheduledDelay?: number
  scheduledPeriod?: number
  scheduledRepeat?: number
  scheduledCron?: string
  counterHeader?: string
  numMessages?: number
}

export interface MoveMessageRequest {
  messageId: string
  destination: string
}

export interface TransportConnector {
  name: string
  uri: string
  started: boolean
  connections: number
  maxConnections: number
}

export interface Connection {
  connectionName: string
  connectorName: string
  remoteAddress: string
  username: string
  slowConsumer: boolean
  subscriptions: number
  dispatchQueueSize: number
  clientId: string
}

export interface NetworkConnector {
  name: string
  uri: string
  started: boolean
  bridgeTempDestinations: boolean
  duplex: boolean
}

export interface ScheduledMessage {
  jobId: string
  next: string
  start: string
  delay: number
  period: number
  repeat: number
  cronEntry: string
}

export interface SchedulerStatus {
  enabled: boolean
  storeUsage: number
  storeLimit: number
  jobs: ScheduledMessage[]
}

export interface HealthStatus {
  status: string
  error?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

export const api = {
  health: (): Promise<HealthStatus> =>
    request('/api/v1/health'),

  getBrokers: (): Promise<Broker[]> =>
    request('/api/v1/brokers'),

  getQueues: (): Promise<Queue[]> =>
    request('/api/v1/queues'),

  getMessages: (queueName: string): Promise<Message[]> =>
    request(`/api/v1/queues/${encodeURIComponent(queueName)}/messages`),

  sendMessage: (queueName: string, data: SendMessageRequest): Promise<{ status: string }> =>
    request(`/api/v1/queues/${encodeURIComponent(queueName)}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  moveMessage: (queueName: string, data: MoveMessageRequest): Promise<{ status: string }> =>
    request(`/api/v1/queues/${encodeURIComponent(queueName)}/move`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  retryMessages: (queueName: string): Promise<{ status: string }> =>
    request(`/api/v1/queues/${encodeURIComponent(queueName)}/retry`, {
      method: 'POST',
    }),

  purgeQueue: (queueName: string): Promise<{ status: string }> =>
    request(`/api/v1/queues/${encodeURIComponent(queueName)}/purge`, {
      method: 'POST',
    }),

  getTopics: (): Promise<Topic[]> =>
    request('/api/v1/topics'),

  createQueue: (name: string): Promise<{ status: string; name: string }> =>
    request('/api/v1/queues', { method: 'POST', body: JSON.stringify({ name }) }),

  createTopic: (name: string): Promise<{ status: string; name: string }> =>
    request('/api/v1/topics', { method: 'POST', body: JSON.stringify({ name }) }),

  getConnectors: (): Promise<TransportConnector[]> =>
    request('/api/v1/connections'),

  getActiveConnections: (): Promise<Connection[]> =>
    request('/api/v1/connections/active'),

  getNetworkConnectors: (): Promise<NetworkConnector[]> =>
    request('/api/v1/network'),

  getScheduled: (): Promise<SchedulerStatus> =>
    request('/api/v1/scheduled'),
}
