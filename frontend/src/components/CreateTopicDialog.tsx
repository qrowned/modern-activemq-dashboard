import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { Plus } from 'lucide-react'

interface CreateTopicDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateTopicDialog({ open, onClose, onCreated }: CreateTopicDialogProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      await api.createTopic(trimmed)
      toast({ title: 'Topic created', description: `"${trimmed}" is ready` })
      setName('')
      onCreated()
      onClose()
    } catch (err) {
      toast({
        title: 'Failed to create topic',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Topic</DialogTitle>
          <DialogDescription>
            Create a new topic on the broker.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic-name">Topic name</Label>
            <Input
              id="topic-name"
              placeholder="e.g. events.orders"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Creating…' : 'Create Topic'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
