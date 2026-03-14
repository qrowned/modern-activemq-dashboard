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
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import { toast } from '@/hooks/useToast'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface SendMessageDialogProps {
  queueName: string
  open: boolean
  onClose: () => void
  sendFn?: (data: Parameters<typeof api.sendMessage>[1]) => Promise<{ status: string }>
}

interface PropertyEntry {
  key: string
  value: string
}

const defaultCounterHeader = 'JMSXMessageCounter'

export function SendMessageDialog({ queueName, open, onClose, sendFn }: SendMessageDialogProps) {
  const [body, setBody] = useState('')
  const [properties, setProperties] = useState<PropertyEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Message header & scheduling (advanced, default hidden)
  const [correlationId, setCorrelationId] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [messageType, setMessageType] = useState('')
  const [messageGroup, setMessageGroup] = useState('')
  const [groupSeq, setGroupSeq] = useState('')
  const [persistent, setPersistent] = useState(false)
  const [priority, setPriority] = useState('')
  const [timeToLive, setTimeToLive] = useState('')
  const [scheduledDelay, setScheduledDelay] = useState('')
  const [scheduledPeriod, setScheduledPeriod] = useState('')
  const [scheduledRepeat, setScheduledRepeat] = useState('')
  const [scheduledCron, setScheduledCron] = useState('')
  const [counterHeader, setCounterHeader] = useState(defaultCounterHeader)
  const [numMessages, setNumMessages] = useState('1')

  const addProperty = () => {
    setProperties(prev => [...prev, { key: '', value: '' }])
  }

  const updateProperty = (index: number, field: 'key' | 'value', value: string) => {
    setProperties(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const removeProperty = (index: number) => {
    setProperties(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!body.trim()) {
      toast({ title: 'Error', description: 'Message body is required', variant: 'destructive' })
      return
    }

    const props: Record<string, string> = {}
    for (const p of properties) {
      if (p.key.trim()) {
        props[p.key.trim()] = p.value
      }
    }

    const payload: Parameters<typeof api.sendMessage>[1] = {
      body: body.trim(),
      properties: Object.keys(props).length > 0 ? props : undefined,
      type: 'text',
    }
    if (correlationId.trim()) payload.correlationId = correlationId.trim()
    if (replyTo.trim()) payload.replyTo = replyTo.trim()
    if (messageType.trim()) payload.messageType = messageType.trim()
    if (messageGroup.trim()) payload.messageGroup = messageGroup.trim()
    const gs = parseInt(groupSeq, 10)
    if (!Number.isNaN(gs)) payload.groupSeq = gs
    payload.persistent = persistent
    const pr = parseInt(priority, 10)
    if (!Number.isNaN(pr) && pr >= 0) payload.priority = pr
    const ttl = parseInt(timeToLive, 10)
    if (!Number.isNaN(ttl) && ttl > 0) payload.timeToLive = ttl
    const delay = parseInt(scheduledDelay, 10)
    if (!Number.isNaN(delay) && delay >= 0) payload.scheduledDelay = delay
    const period = parseInt(scheduledPeriod, 10)
    if (!Number.isNaN(period) && period >= 0) payload.scheduledPeriod = period
    const repeat = parseInt(scheduledRepeat, 10)
    if (!Number.isNaN(repeat) && repeat > 0) payload.scheduledRepeat = repeat
    if (scheduledCron.trim()) payload.scheduledCron = scheduledCron.trim()
    if (counterHeader.trim()) payload.counterHeader = counterHeader.trim()
    const num = parseInt(numMessages, 10)
    if (!Number.isNaN(num) && num > 0) payload.numMessages = num

    setLoading(true)
    try {
      await (sendFn ? sendFn(payload) : api.sendMessage(queueName, payload))
      toast({ title: 'Message sent', description: `Message sent to ${queueName}` })
      setBody('')
      setProperties([])
      onClose()
    } catch (err) {
      toast({
        title: 'Failed to send message',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Message to {queueName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="body">Message Body</Label>
            <Textarea
              id="body"
              placeholder="Enter message body..."
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="border rounded-md">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Message header &amp; scheduling
              {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {advancedOpen && (
              <div className="border-t px-3 py-3 space-y-3 bg-muted/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <Label className="text-xs">Correlation ID</Label>
                    <Input placeholder="JMSCorrelationID" value={correlationId} onChange={e => setCorrelationId(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reply To</Label>
                    <Input placeholder="Queue or topic" value={replyTo} onChange={e => setReplyTo(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Input placeholder="JMSType" value={messageType} onChange={e => setMessageType(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Message Group</Label>
                    <Input placeholder="JMSXGroupID" value={messageGroup} onChange={e => setMessageGroup(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Group sequence</Label>
                    <Input type="number" placeholder="JMSXGroupSeq" value={groupSeq} onChange={e => setGroupSeq(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1 flex items-end gap-2 pb-1">
                    <div className="flex items-center gap-2">
                      <Switch id="persistent" checked={persistent} onCheckedChange={setPersistent} />
                      <Label htmlFor="persistent" className="text-xs font-normal">Persistent delivery</Label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priority (0–9)</Label>
                    <Input type="number" min={0} max={9} placeholder="JMS default" value={priority} onChange={e => setPriority(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time to live (ms)</Label>
                    <Input type="number" min={0} placeholder="TTL" value={timeToLive} onChange={e => setTimeToLive(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Delay (ms)</Label>
                    <Input type="number" min={0} placeholder="Before first delivery" value={scheduledDelay} onChange={e => setScheduledDelay(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Period (ms) between repeats</Label>
                    <Input type="number" min={0} placeholder="Scheduling interval" value={scheduledPeriod} onChange={e => setScheduledPeriod(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Number of repeats</Label>
                    <Input type="number" min={1} placeholder="Repeat count" value={scheduledRepeat} onChange={e => setScheduledRepeat(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">CRON (scheduling)</Label>
                    <Input placeholder="e.g. 0 * * * *" value={scheduledCron} onChange={e => setScheduledCron(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Header to store counter</Label>
                    <Input placeholder="JMSXMessageCounter" value={counterHeader} onChange={e => setCounterHeader(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Number of messages to send</Label>
                    <Input type="number" min={1} value={numMessages} onChange={e => setNumMessages(e.target.value)} className="h-8" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Properties</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProperty}>
                <Plus className="h-4 w-4 mr-1" />
                Add Property
              </Button>
            </div>
            {properties.map((prop, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Key"
                  value={prop.key}
                  onChange={e => updateProperty(index, 'key', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={prop.value}
                  onChange={e => updateProperty(index, 'value', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeProperty(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            {loading ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
