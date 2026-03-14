import { useState, useEffect, useCallback } from 'react'
import { Topic, api } from '@/lib/api'
import { TopicTable } from '@/components/TopicTable'
import { SendMessageDialog } from '@/components/SendMessageDialog'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { RefreshCw, AlertCircle, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateTopicDialog } from '@/components/CreateTopicDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/hooks/useToast'

export function Topics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [sendTopic, setSendTopic] = useState<Topic | null>(null)
  const [deleteTopic, setDeleteTopic] = useState<Topic | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    if (!deleteTopic) return
    setDeleting(true)
    try {
      await api.deleteTopic(deleteTopic.name)
      toast({ title: 'Topic deleted', description: `${deleteTopic.name} has been deleted` })
      setDeleteTopic(null)
      fetchTopics()
    } catch (err) {
      toast({
        title: 'Failed to delete topic',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

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
        <TopicTable
          topics={topics}
          onSend={setSendTopic}
          onDelete={setDeleteTopic}
        />
      )}

      <CreateTopicDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchTopics}
      />

      {sendTopic && (
        <SendMessageDialog
          queueName={sendTopic.name}
          open
          onClose={() => setSendTopic(null)}
          sendFn={data => api.sendTopicMessage(sendTopic.name, data)}
        />
      )}

      {deleteTopic && (
        <Dialog open onOpenChange={open => !open && setDeleteTopic(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete Topic
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-1">
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">
                      This will permanently delete the topic. This action cannot be undone.
                    </p>
                  </div>
                  <div className="text-sm flex justify-between">
                    <span className="text-muted-foreground">Topic</span>
                    <span className="font-mono font-medium">{deleteTopic.name}</span>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteTopic(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete Topic'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
