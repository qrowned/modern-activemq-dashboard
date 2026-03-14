import { useState, useEffect, useCallback } from 'react'
import { TransportConnector, Connection, api } from '@/lib/api'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RefreshCw, AlertCircle, Plug, Wifi } from 'lucide-react'

function protocolColor(name: string) {
  const map: Record<string, string> = {
    openwire: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    amqp:     'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    stomp:    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    mqtt:     'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    ws:       'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  }
  return map[name.toLowerCase()] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

export function Connections() {
  const [connectors, setConnectors] = useState<TransportConnector[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([api.getConnectors(), api.getActiveConnections()])
      setConnectors(c)
      setConnections(a)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useAutoRefresh(fetchAll, 10000)

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading connections…</p>
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
          <Button onClick={fetchAll}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">
            {connectors.length} transport connector{connectors.length !== 1 ? 's' : ''}
            {connections.length > 0 && ` · ${connections.length} active connection${connections.length !== 1 ? 's' : ''}`}
            {lastUpdated && ` · ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Transport Connectors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4 text-primary" />
            Transport Connectors
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocol</TableHead>
                <TableHead>URI</TableHead>
                <TableHead className="text-right">Max Connections</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connectors.map(c => (
                <TableRow key={c.name}>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${protocolColor(c.name)}`}>
                      {c.name.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{c.uri}</TableCell>
                  <TableCell className="text-right font-mono">{c.maxConnections.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {c.started
                      ? <Badge variant="success">Running</Badge>
                      : <Badge variant="destructive">Stopped</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Connections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="h-4 w-4 text-primary" />
            Active Connections
            <Badge variant="outline" className="ml-1">{connections.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className={connections.length === 0 ? 'pb-6' : 'p-0'}>
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No active client connections right now.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Connector</TableHead>
                  <TableHead>Remote Address</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Dispatch Queue</TableHead>
                  <TableHead className="text-right">Slow Consumer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map(c => (
                  <TableRow key={c.connectionName}>
                    <TableCell className="font-mono text-sm">{c.clientId || c.connectionName}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${protocolColor(c.connectorName)}`}>
                        {c.connectorName.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{c.remoteAddress}</TableCell>
                    <TableCell className="text-muted-foreground">{c.username || '—'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {c.dispatchQueueSize > 0
                        ? <span className="text-orange-500 font-semibold">{c.dispatchQueueSize}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.slowConsumer
                        ? <Badge variant="destructive">Yes</Badge>
                        : <Badge variant="outline">No</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
