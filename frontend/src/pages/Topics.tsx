import { useState, useEffect, useCallback } from 'react'
import { Topic, api } from '@/lib/api'
import { TopicTable } from '@/components/TopicTable'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { RefreshCw, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateTopicDialog } from '@/components/CreateTopicDialog'

export function Topics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchTopics = useCallback(async () => {
    try {
      const data = await api.getTopics()
      setTopics(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTopics() }, [fetchTopics])
  useAutoRefresh(fetchTopics, 10000)

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading topics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
          <p className="text-muted-foreground">
            {topics.length} topic{topics.length !== 1 ? 's' : ''}
            {lastUpdated && ` · Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTopics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Topic
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Error Loading Topics</h2>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={fetchTopics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <TopicTable topics={topics} />
      )}

      <CreateTopicDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchTopics}
      />
    </div>
  )
}
