"use client"

interface ProgressBarProps {
  progress: number
  visible: boolean
}

export function ProgressBar({ progress, visible }: ProgressBarProps) {
  if (!visible) return null

  return (
    <div className="w-full bg-muted rounded-lg overflow-hidden my-3">
      <div
        className="h-6 bg-primary transition-all duration-300 flex items-center justify-center text-primary-foreground font-bold text-sm"
        style={{ width: `${progress}%` }}
      >
        {progress}%
      </div>
    </div>
  )
}
