"use client"

import { useMemo } from "react"
import type { ProductMap } from "@/lib/types"

interface AnalysisViewProps {
  products: ProductMap
}

export function AnalysisView({ products }: AnalysisViewProps) {
  const sellerStats = useMemo(() => {
    const stats: Record<string, number> = {}
    Object.values(products).forEach((prod) => {
      const last = prod.last ||
        (prod.points.length ? prod.points[prod.points.length - 1] : null)
      if (!last || last.seller === "N/A") return
      const seller = last.seller.trim()
      stats[seller] = (stats[seller] || 0) + 1
    })
    return stats
  }, [products])

  const total = Object.values(sellerStats).reduce((a, b) => a + b, 0)
  const sorted = Object.entries(sellerStats).sort((a, b) => b[1] - a[1])

  const colors = [
    "#FF9900",
    "#36A2EB",
    "#FF6384",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#C9CBCF",
    "#7C3AED",
  ]

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-foreground">Market Share Analysis</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sorted.map(([seller, count], i) => {
          const pct = total ? ((count / total) * 100).toFixed(1) : 0
          return (
            <div
              key={seller}
              className="bg-card rounded-lg p-5 shadow-md text-center"
            >
              <h3
                className="text-3xl font-bold mb-1"
                style={{ color: colors[i % colors.length] }}
              >
                {count}
              </h3>
              <p className="text-muted-foreground text-sm">
                {seller} ({pct}%)
              </p>
            </div>
          )
        })}
      </div>

      {/* Simple bar chart visualization */}
      <div className="bg-card rounded-lg p-6 shadow-md">
        <h3 className="font-bold mb-4 text-foreground">Buy Box Distribution</h3>
        <div className="space-y-3">
          {sorted.map(([seller, count], i) => {
            const pct = total ? (count / total) * 100 : 0
            return (
              <div key={seller} className="flex items-center gap-3">
                <div className="w-32 truncate text-sm text-foreground">{seller}</div>
                <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: colors[i % colors.length],
                    }}
                  >
                    <span className="text-xs font-bold text-white">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-12 text-right text-sm font-bold text-foreground">{count}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
