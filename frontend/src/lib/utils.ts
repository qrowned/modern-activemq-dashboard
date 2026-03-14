import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function formatTimestamp(ts: number): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString(undefined, { timeZoneName: 'short' })
}

// Parse broker date strings like "2026-03-14 17:00:00" (UTC) into local time.
export function formatScheduledDate(s: string): string {
  if (!s) return '—'
  const d = new Date(s.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return s
  return d.toLocaleString(undefined, { timeZoneName: 'short' })
}

export function truncate(str: string, maxLength: number): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}
