"use client"

interface StatCardProps {
  value: string | number
  label: string
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="rounded-lg bg-card p-5 shadow-md text-center">
      <h3 className="text-3xl font-bold text-primary mb-1">{value}</h3>
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  )
}
