import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle } from 'lucide-react'

interface PurgeConfirmDialogProps {
  queue: { name: string; queueSize: number } | null
  onConfirm: (name: string) => void
  onClose: () => void
}

export function PurgeConfirmDialog({ queue, onConfirm, onClose }: PurgeConfirmDialogProps) {
  if (!queue) return null

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Purge Queue
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1">
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">
                  This will permanently delete all messages. This action cannot be undone.
                </p>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queue</span>
                  <span className="font-mono font-medium">{queue.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages to delete</span>
                  <span className={`font-semibold ${queue.queueSize > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {queue.queueSize.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(queue.name); onClose() }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Purge {queue.queueSize > 0 ? `${queue.queueSize.toLocaleString()} messages` : 'queue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
