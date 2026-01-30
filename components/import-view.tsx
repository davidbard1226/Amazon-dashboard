"use client"

import { useState, useRef } from "react"
import { parsePrice } from "@/lib/scraper"

interface ImportViewProps {
  onImport: (data: Array<{
    asin: string
    sku?: string
    title?: string
    myPrice?: number
    stock?: number
  }>) => void
}

export function ImportView({ onImport }: ImportViewProps) {
  const [status, setStatus] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImport = () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setStatus("Please select a file first")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter((l) => l.trim())
      if (lines.length < 2) {
        setStatus("Invalid CSV file")
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
      const asinIndex = headers.findIndex((h) => h === "asin")
      const skuIndex = headers.findIndex((h) => h === "sku")
      const titleIndex = headers.findIndex((h) => h === "title")
      const priceIndex = headers.findIndex((h) => h.includes("selling") || h === "price")
      const stockIndex = headers.findIndex((h) => h === "stock")

      if (asinIndex === -1) {
        setStatus("CSV must have an ASIN column")
        return
      }

      const data = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim())
        return {
          asin: cols[asinIndex] || "",
          sku: skuIndex >= 0 ? cols[skuIndex] : undefined,
          title: titleIndex >= 0 ? cols[titleIndex] : undefined,
          myPrice: priceIndex >= 0 ? parsePrice(cols[priceIndex] || "0") : undefined,
          stock: stockIndex >= 0 ? parseInt(cols[stockIndex] || "0") : undefined,
        }
      }).filter((r) => r.asin.length === 10)

      onImport(data)
      setStatus(`Imported ${data.length} products. Hit 'Refresh All' to update market data.`)
      if (fileRef.current) fileRef.current.value = ""
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-foreground">Bulk Import Selling Data</h2>
      <p className="text-muted-foreground mb-4">
        Upload a CSV file with columns:{" "}
        <strong className="text-foreground">ASIN, SKU, Title, My Selling, Stock</strong>
      </p>
      <div className="flex gap-3 items-center flex-wrap">
        <input
          type="file"
          accept=".csv"
          ref={fileRef}
          className="text-foreground"
        />
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
        >
          Import & Sync
        </button>
      </div>
      {status && (
        <p className="mt-4 text-sm text-muted-foreground">{status}</p>
      )}
    </div>
  )
}
