import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Queue } from '@/lib/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Eye, Send, Trash2, RefreshCw } from 'lucide-react'
import { SendMessageDialog } from '@/components/SendMessageDialog'
import { PurgeConfirmDialog } from '@/components/PurgeConfirmDialog'

interface QueueTableProps {
  queues: Queue[]
  onPurge: (name: string) => void
  onRetry: (name: string) => void
  compact?: boolean
}

export function QueueTable({ queues, onPurge, onRetry, compact = false }: QueueTableProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sendDialogQueue, setSendDialogQueue] = useState<string | null>(null)
  const [purgeQueue, setPurgeQueue] = useState<{ name: string; queueSize: number } | null>(null)

  const filtered = queues.filter(q =>
    q.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search queues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-right">Enqueued</TableHead>
              <TableHead className="text-right">Dequeued</TableHead>
              <TableHead className="text-right">Consumers</TableHead>
              <TableHead className="text-right">Producers</TableHead>
              <TableHead className="text-right">Memory %</TableHead>
              {!compact && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={compact ? 7 : 8} className="text-center text-muted-foreground py-8">
                  No queues found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(queue => (
                <TableRow key={queue.name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        className="cursor-pointer hover:text-primary hover:underline"
                        onClick={() => navigate(`/queues/${encodeURIComponent(queue.name)}/messages`)}
                      >
                        {queue.name}
                      </span>
                      {queue.dlq && (
                        <Badge variant="destructive" className="text-xs">DLQ</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {queue.queueSize > 0 ? (
                      <span className="text-orange-500 font-semibold">{queue.queueSize.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {queue.enqueueCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {queue.dequeueCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {queue.consumerCount > 0 ? (
                      <Badge variant="success">{queue.consumerCount}</Badge>
                    ) : (
                      <Badge variant="outline">{queue.consumerCount}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-muted-foreground">{queue.producerCount}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={queue.memoryPercentage > 70 ? 'text-orange-500' : 'text-muted-foreground'}>
                      {queue.memoryPercentage.toFixed(1)}%
                    </span>
                  </TableCell>
                  {!compact && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/queues/${encodeURIComponent(queue.name)}/messages`)}
                          title="Browse messages"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSendDialogQueue(queue.name)}
                          title="Send message"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        {queue.dlq && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRetry(queue.name)}
                            title="Retry all messages"
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPurgeQueue({ name: queue.name, queueSize: queue.queueSize })}
                          title="Purge queue"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {sendDialogQueue && (
        <SendMessageDialog
          queueName={sendDialogQueue}
          open={true}
          onClose={() => setSendDialogQueue(null)}
        />
      )}

      <PurgeConfirmDialog
        queue={purgeQueue}
        onConfirm={name => onPurge(name)}
        onClose={() => setPurgeQueue(null)}
      />
    </div>
  )
}
