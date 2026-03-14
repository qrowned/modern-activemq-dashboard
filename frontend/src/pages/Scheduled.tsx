import { useState, useEffect, useCallback } from 'react'
import { SchedulerStatus, api } from '@/lib/api'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RefreshCw, AlertCircle, Clock, Info } from 'lucide-react'
import { formatScheduledDate } from '@/lib/utils'

function formatMs(ms: number): string {
  if (ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`
  return `${(ms / 3_600_000).toFixed(1)}h`
}

export function Scheduled() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchScheduled = useCallback(async () => {
    try {
      const data = await api.getScheduled()
      setStatus(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduled messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchScheduled() }, [fetchScheduled])
  useAutoRefresh(fetchScheduled, 10000)

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading scheduled messages…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8 flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchScheduled}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
        </div>
      </div>
    )
  }

  const jobs = status?.jobs ?? []

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled</h1>
          <p className="text-muted-foreground">
            {status?.enabled
              ? `${jobs.length} scheduled job${jobs.length !== 1 ? 's' : ''}`
              : 'Scheduler not enabled'}
            {lastUpdated && ` · ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchScheduled}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {!status?.enabled ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4 max-w-lg mx-auto">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Scheduler Not Enabled</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  The ActiveMQ job scheduler plugin is not active on this broker.
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-4 text-left text-sm space-y-2">
                <p className="flex items-center gap-2 font-medium">
                  <Info className="h-4 w-4 shrink-0 text-primary" />
                  How to enable scheduled messaging
                </p>
                <p className="text-muted-foreground">
                  Add the scheduler plugin to your <code className="bg-muted px-1 rounded">activemq.xml</code>:
                </p>
                <pre className="bg-muted rounded p-2 text-xs overflow-x-auto">{`<broker schedulerSupport="true" ...>
  ...
</broker>`}</pre>
                <p className="text-muted-foreground">
                  Then send messages with <code className="bg-muted px-1 rounded">AMQ_SCHEDULED_DELAY</code>,{' '}
                  <code className="bg-muted px-1 rounded">AMQ_SCHEDULED_PERIOD</code>, or{' '}
                  <code className="bg-muted px-1 rounded">AMQ_SCHEDULED_CRON</code> headers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Scheduled Jobs
              <Badge variant="outline" className="ml-1">{jobs.length}</Badge>
              {(status.storeLimit ?? 0) > 0 && (
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  Store: {status.storeUsage.toFixed(1)}%
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className={jobs.length === 0 ? 'pb-6' : 'p-0'}>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No scheduled jobs pending.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Next</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead className="text-right">Delay</TableHead>
                    <TableHead className="text-right">Period</TableHead>
                    <TableHead className="text-right">Repeat</TableHead>
                    <TableHead>Cron</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map(job => (
                    <TableRow key={job.jobId}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{job.jobId}</TableCell>
                      <TableCell className="text-sm tabular-nums">{formatScheduledDate(job.next)}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{formatScheduledDate(job.start)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatMs(job.delay)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatMs(job.period)}</TableCell>
                      <TableCell className="text-right">
                        {job.repeat === -1
                          ? <Badge variant="outline">∞</Badge>
                          : <span className="font-mono text-sm">{job.repeat || '—'}</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {job.cronEntry || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
