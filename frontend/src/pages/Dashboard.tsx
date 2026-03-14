import { useState, useEffect, useCallback } from 'react'
import { Broker, Queue, api } from '@/lib/api'
import { BrokerCard } from '@/components/BrokerCard'
import { StatsCard } from '@/components/StatsCard'
import { QueueTable } from '@/components/QueueTable'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { toast } from '@/hooks/useToast'
import { Layers, Users, Zap, MessageSquare, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Dashboard() {
  const [broker, setBroker] = useState<Broker | null>(null)
  const [queues, setQueues] = useState<Queue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [brokers, queueList] = await Promise.all([
        api.getBrokers(),
        api.getQueues(),
      ])
      setBroker(brokers[0] || null)
      setQueues(queueList)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to ActiveMQ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useAutoRefresh(fetchData, 10000)

  const handlePurge = async (name: string) => {
    if (!confirm(`Are you sure you want to purge queue "${name}"?`)) return
    try {
      await api.purgeQueue(name)
      toast({ title: 'Queue purged', description: `${name} has been purged` })
      fetchData()
    } catch (err) {
      toast({ title: 'Purge failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    }
  }

  const handleRetry = async (name: string) => {
    try {
      await api.retryMessages(name)
      toast({ title: 'Messages retried', description: `Messages from ${name} have been retried` })
      fetchData()
    } catch (err) {
      toast({ title: 'Retry failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Connecting to ActiveMQ...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Connection Error</h2>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const topQueues = [...queues]
    .sort((a, b) => b.queueSize - a.queueSize)
    .slice(0, 10)

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {broker && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <BrokerCard broker={broker} />
          </div>
          <div className="lg:col-span-2 grid gap-4 grid-cols-2">
            <StatsCard
              title="Total Queues"
              value={broker.totalQueues.toLocaleString()}
              icon={Layers}
              description="Active destination queues"
            />
            <StatsCard
              title="Total Messages"
              value={broker.totalMessages.toLocaleString()}
              icon={MessageSquare}
              description="Messages in all queues"
            />
            <StatsCard
              title="Total Consumers"
              value={broker.totalConsumers.toLocaleString()}
              icon={Users}
              description="Connected consumers"
            />
            <StatsCard
              title="Total Producers"
              value={broker.totalProducers.toLocaleString()}
              icon={Zap}
              description="Active producers"
            />
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Top Queues by Size</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <QueueTable
            queues={topQueues}
            onPurge={handlePurge}
            onRetry={handleRetry}
            compact={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
