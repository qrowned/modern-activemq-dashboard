import { Message } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatTimestamp } from '@/lib/utils'

interface MessageDetailDialogProps {
  message: Message | null
  open: boolean
  onClose: () => void
}

export function MessageDetailDialog({ message, open, onClose }: MessageDetailDialogProps) {
  if (!message) return null

  const hasProperties = message.properties && Object.keys(message.properties).length > 0

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Message Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground font-medium">Message ID</span>
              <p className="font-mono text-xs mt-0.5 break-all">{message.messageId || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Type</span>
              <p className="mt-0.5">
                <Badge variant="secondary">{message.type || 'TextMessage'}</Badge>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Timestamp</span>
              <p className="mt-0.5">{formatTimestamp(message.timestamp)}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Destination</span>
              <p className="font-mono text-xs mt-0.5">{message.destination || '-'}</p>
            </div>
          </div>

          <Separator />

          <div>
            <span className="text-sm font-medium text-muted-foreground">Body</span>
            <div className="mt-2 p-3 bg-muted rounded-md">
              <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                {message.body || '(empty)'}
              </pre>
            </div>
          </div>

          {hasProperties && (
            <>
              <Separator />
              <div>
                <span className="text-sm font-medium text-muted-foreground">Properties</span>
                <div className="mt-2 space-y-1">
                  {Object.entries(message.properties).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-sm py-1 border-b last:border-0">
                      <span className="font-medium w-40 shrink-0 text-muted-foreground">{key}</span>
                      <span className="font-mono break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
