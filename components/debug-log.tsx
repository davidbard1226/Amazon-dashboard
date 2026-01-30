"use client"

interface LogEntry {
  message: string
  isError: boolean
  time: Date
}

interface DebugLogProps {
  logs: LogEntry[]
  visible: boolean
}

export function DebugLog({ logs, visible }: DebugLogProps) {
  if (!visible || logs.length === 0) return null

  return (
    <div className="bg-[#1e1e1e] text-[#00ff00] font-mono p-4 text-xs rounded-lg max-h-48 overflow-y-auto mt-5">
      {logs.map((log, i) => (
        <div
          key={i}
          style={{ color: log.isError ? "#ff5555" : "#00ff00" }}
        >
          [{log.time.toLocaleTimeString()}] {log.message}
        </div>
      ))}
    </div>
  )
}
