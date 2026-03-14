import { useState } from 'react'
import { Message, api } from '@/lib/api'
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
import { Eye, MoveRight, RotateCcw } from 'lucide-react'
import { formatTimestamp, truncate } from '@/lib/utils'
import { MessageDetailDialog } from '@/components/MessageDetailDialog'
import { MoveMessageDialog } from '@/components/MoveMessageDialog'
import { toast } from '@/hooks/useToast'

interface MessageTableProps {
  messages: Message[]
  queueName: string
  isDLQ?: boolean
  onRefresh: () => void
}

function retryDestination(queueName: string): string {
  if (queueName.startsWith('DLQ.')) return queueName.slice(4)
  if (queueName.startsWith('ActiveMQ.DLQ.')) return queueName.slice(13)
  return queueName
}

export function MessageTable({ messages, queueName, isDLQ = false, onRefresh }: MessageTableProps) {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [moveMessage, setMoveMessage] = useState<Message | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  async function handleRetry(msg: Message) {
    const dest = retryDestination(queueName)
    setRetrying(msg.messageId)
    try {
      await api.moveMessage(queueName, { messageId: msg.messageId, destination: dest })
      toast({ title: 'Message retried', description: `Moved to ${dest}` })
      onRefresh()
    } catch (err) {
      toast({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Message ID</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Body</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No messages in queue
                </TableCell>
              </TableRow>
            ) : (
              messages.map((msg, index) => (
                <TableRow
                  key={msg.messageId || index}
                  className="cursor-pointer"
                  onClick={() => setSelectedMessage(msg)}
                >
                  <TableCell className="font-mono text-xs max-w-[200px] truncate">
                    {msg.messageId || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(msg.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {msg.type || 'TextMessage'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncate(msg.body, 80)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={e => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMessage(msg)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMoveMessage(msg)}
                        title="Move message"
                      >
                        <MoveRight className="h-4 w-4" />
                      </Button>
                      {isDLQ && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(msg)}
                          title={`Retry — move to ${retryDestination(queueName)}`}
                          disabled={retrying === msg.messageId}
                        >
                          <RotateCcw className={`h-4 w-4 ${retrying === msg.messageId ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MessageDetailDialog
        message={selectedMessage}
        open={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
      />

      {moveMessage && (
        <MoveMessageDialog
          messageId={moveMessage.messageId}
          sourceQueue={queueName}
          open={true}
          onClose={() => setMoveMessage(null)}
          onMoved={onRefresh}
        />
      )}
    </div>
  )
}
