import { Broker } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Server, Clock, Activity } from 'lucide-react'

interface BrokerCardProps {
  broker: Broker
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function UsageBar({
  label,
  percent,
  usedBytes,
  limitBytes,
}: {
  label: string
  percent: number
  usedBytes: number
  limitBytes: number
}) {
  const used = limitBytes > 0 ? Math.round((percent / 100) * limitBytes) : usedBytes
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {percent.toFixed(0)}%
          {limitBytes > 0 && (
            <span className="text-muted-foreground font-normal ml-1">
              ({formatBytes(used)} / {formatBytes(limitBytes)})
            </span>
          )}
        </span>
      </div>
      <Progress value={percent} />
    </div>
  )
}

export function BrokerCard({ broker }: BrokerCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5 text-primary" />
            {broker.name}
          </CardTitle>
          <Badge variant="success">Online</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            v{broker.version}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {broker.uptime}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <UsageBar label="Memory" percent={broker.memoryUsage} usedBytes={0} limitBytes={broker.memoryLimit} />
        <UsageBar label="Store"  percent={broker.storeUsage}  usedBytes={0} limitBytes={broker.storeLimit} />
        <UsageBar label="Temp"   percent={broker.tempUsage}   usedBytes={0} limitBytes={broker.tempLimit} />
      </CardContent>
    </Card>
  )
}
