import { formatDistanceToNow } from "date-fns"

const formatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
})

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index

  return `${formatter.format(value)} ${units[index]}`
}

export function formatRelativeDate(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}
