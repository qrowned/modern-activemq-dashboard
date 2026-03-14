import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Message, api } from '@/lib/api'
import { MessageTable } from '@/components/MessageTable'
import { SendMessageDialog } from '@/components/SendMessageDialog'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { toast } from '@/hooks/useToast'
import { RefreshCw, AlertCircle, ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Messages() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const queueName = decodeURIComponent(name || '')

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)

  const fetchMessages = useCallback(async () => {
    if (!queueName) return
    try {
      const data = await api.getMessages(queueName)
      setMessages(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [queueName])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useAutoRefresh(fetchMessages, 10000)

  if (!queueName) {
    navigate('/queues')
    return null
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/queues')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Queues
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{queueName}</h1>
              <Badge variant="secondary">{messages.length} messages</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchMessages}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setSendDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Error Loading Messages</h2>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={fetchMessages}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <MessageTable
          messages={messages}
          queueName={queueName}
          isDLQ={queueName.startsWith('DLQ.') || queueName.startsWith('ActiveMQ.DLQ')}
          onRefresh={fetchMessages}
        />
      )}

      <SendMessageDialog
        queueName={queueName}
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
      />
    </div>
  )
}
