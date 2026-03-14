import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'

interface MoveMessageDialogProps {
  messageId: string
  sourceQueue: string
  open: boolean
  onClose: () => void
  onMoved: () => void
}

export function MoveMessageDialog({
  messageId,
  sourceQueue,
  open,
  onClose,
  onMoved,
}: MoveMessageDialogProps) {
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMove = async () => {
    if (!destination.trim()) {
      toast({ title: 'Error', description: 'Destination queue is required', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      await api.moveMessage(sourceQueue, {
        messageId,
        destination: destination.trim(),
      })
      toast({ title: 'Message moved', description: `Message moved to ${destination}` })
      setDestination('')
      onMoved()
      onClose()
    } catch (err) {
      toast({
        title: 'Failed to move message',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1 text-sm">
            <span className="text-muted-foreground">Message ID:</span>
            <p className="font-mono text-xs break-all">{messageId}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination">Destination Queue</Label>
            <Input
              id="destination"
              placeholder="e.g. MyQueue"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleMove()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={loading}>
            {loading ? 'Moving...' : 'Move Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
