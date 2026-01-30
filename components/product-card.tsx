"use client"

import type { Product } from "@/lib/types"

interface ProductCardProps {
  asin: string
  product: Product
  onRefresh: (asin: string) => void
  onDelete: (asin: string) => void
}

export function ProductCard({ asin, product, onRefresh, onDelete }: ProductCardProps) {
  const last = product.last ||
    (product.points.length
      ? product.points[product.points.length - 1]
      : { raw: "N/A", seller: "N/A", price: 0 })

  const isBonolo = last.seller.toLowerCase().includes("bonolo")
  const diff = product.myPrice ? last.price - product.myPrice : null

  return (
    <div className="bg-card rounded-lg p-5 shadow-md">
      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
        {product.title.substring(0, 60)}...
      </h3>
      <div className="flex gap-2 text-xs mb-3">
        <span className="bg-muted px-2 py-1 rounded font-mono">
          SKU: {product.sku || "N/A"}
        </span>
        <span className={product.stock < 5 ? "text-destructive" : ""}>
          Stock: {product.stock || 0}
        </span>
      </div>
      <div className="text-2xl font-bold text-[#B12704] mb-2">{last.raw}</div>
      <p className="text-sm mb-1">
        Buy Box:{" "}
        <span className={isBonolo ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
          {last.seller}
        </span>
      </p>
      <p className="text-sm mb-3">
        My Price: R {product.myPrice || 0}{" "}
        {diff !== null && (
          <span className={diff >= 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
            ({diff >= 0 ? "+" : ""}
            {diff.toFixed(2)})
          </span>
        )}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onRefresh(asin)}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
        >
          Refresh
        </button>
        <button
          onClick={() => onDelete(asin)}
          className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded text-sm font-medium hover:bg-destructive/90"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
