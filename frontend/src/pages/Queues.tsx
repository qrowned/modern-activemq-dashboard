import { useState, useEffect, useCallback } from 'react'
import { Queue, api } from '@/lib/api'
import { QueueTable } from '@/components/QueueTable'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { toast } from '@/hooks/useToast'
import { RefreshCw, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateQueueDialog } from '@/components/CreateQueueDialog'

export function Queues() {
  const [queues, setQueues] = useState<Queue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchQueues = useCallback(async () => {
    try {
      const data = await api.getQueues()
      setQueues(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queues')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueues()
  }, [fetchQueues])

  useAutoRefresh(fetchQueues, 10000)

  const handlePurge = async (name: string) => {
    try {
      await api.purgeQueue(name)
      toast({ title: 'Queue purged', description: `${name} has been purged successfully` })
      fetchQueues()
    } catch (err) {
      toast({
        title: 'Purge failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const handleRetry = async (name: string) => {
    try {
      await api.retryMessages(name)
      toast({ title: 'Messages retried', description: `All messages from ${name} have been moved` })
      fetchQueues()
    } catch (err) {
      toast({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading queues...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queues</h1>
          <p className="text-muted-foreground">
            {queues.length} queue{queues.length !== 1 ? 's' : ''}
            {lastUpdated && ` · Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchQueues}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Queue
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Error Loading Queues</h2>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={fetchQueues}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <QueueTable
          queues={queues}
          onPurge={handlePurge}
          onRetry={handleRetry}
        />
      )}

      <CreateQueueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchQueues}
      />
    </div>
  )
}
