import { useState, useEffect, useCallback } from 'react'
import { NetworkConnector, api } from '@/lib/api'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { RefreshCw, AlertCircle, Network as NetworkIcon, Info } from 'lucide-react'

export function Network() {
  const [connectors, setConnectors] = useState<NetworkConnector[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchConnectors = useCallback(async () => {
    try {
      const data = await api.getNetworkConnectors()
      setConnectors(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network connectors')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConnectors() }, [fetchConnectors])
  useAutoRefresh(fetchConnectors, 15000)

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading network…</p>
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
          <Button onClick={fetchConnectors}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Network</h1>
          <p className="text-muted-foreground">
            {connectors.length} network connector{connectors.length !== 1 ? 's' : ''}
            {lastUpdated && ` · ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConnectors}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <NetworkIcon className="h-4 w-4 text-primary" />
            Network Connectors
            <Badge variant="outline" className="ml-1">{connectors.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className={connectors.length === 0 ? 'pb-6' : 'p-0'}>
          {connectors.length === 0 ? (
            <div className="space-y-3 text-center py-6 px-4">
              <p className="text-sm text-muted-foreground">
                No network connectors configured. This broker is running in standalone mode.
              </p>
              <div className="rounded-md border border-border bg-muted/40 p-4 text-left text-sm text-muted-foreground space-y-1 max-w-lg mx-auto">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  About Network Connectors
                </p>
                <p>
                  Network connectors create broker-to-broker bridges for distributing messages
                  across a cluster. Add them to <code className="bg-muted px-1 rounded">activemq.xml</code> under{' '}
                  <code className="bg-muted px-1 rounded">&lt;networkConnectors&gt;</code>.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URI</TableHead>
                  <TableHead className="text-center">Duplex</TableHead>
                  <TableHead className="text-center">Bridge Temp</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connectors.map(nc => (
                  <TableRow key={nc.name}>
                    <TableCell className="font-medium">{nc.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{nc.uri}</TableCell>
                    <TableCell className="text-center">
                      {nc.duplex ? <Badge variant="success">Yes</Badge> : <Badge variant="outline">No</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      {nc.bridgeTempDestinations ? <Badge variant="outline">Yes</Badge> : <Badge variant="outline">No</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {nc.started
                        ? <Badge variant="success">Running</Badge>
                        : <Badge variant="destructive">Stopped</Badge>}
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
