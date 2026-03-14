import { useState } from 'react'
import { Topic } from '@/lib/api'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface TopicTableProps {
  topics: Topic[]
  compact?: boolean
}

export function TopicTable({ topics, compact = false }: TopicTableProps) {
  const [search, setSearch] = useState('')

  const filtered = topics.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Enqueued</TableHead>
              <TableHead className="text-right">Dequeued</TableHead>
              <TableHead className="text-right">Dispatched</TableHead>
              <TableHead className="text-right">In-Flight</TableHead>
              <TableHead className="text-right">Consumers</TableHead>
              <TableHead className="text-right">Producers</TableHead>
              <TableHead className="text-right">Memory %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No topics found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(topic => (
                <TableRow key={topic.name}>
                  <TableCell className="font-medium font-mono text-sm">
                    {topic.name}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {topic.enqueueCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {topic.dequeueCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {topic.dispatchCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {topic.inFlightCount > 0 ? (
                      <span className="text-orange-500 font-semibold">{topic.inFlightCount.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {topic.consumerCount > 0 ? (
                      <Badge variant="success">{topic.consumerCount}</Badge>
                    ) : (
                      <Badge variant="outline">{topic.consumerCount}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-muted-foreground">{topic.producerCount}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={topic.memoryPercentage > 70 ? 'text-orange-500' : 'text-muted-foreground'}>
                      {topic.memoryPercentage.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
