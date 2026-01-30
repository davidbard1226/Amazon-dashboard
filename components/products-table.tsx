"use client"

import { useState, useMemo } from "react"
import type { ProductMap } from "@/lib/types"
import { parsePrice } from "@/lib/scraper"

interface ProductsTableProps {
  products: ProductMap
  onRefresh: (asins: string[]) => void
  onDelete: (asin: string) => void
}

export function ProductsTable({ products, onRefresh, onDelete }: ProductsTableProps) {
  const [search, setSearch] = useState("")
  const [winFilter, setWinFilter] = useState("all")
  const [sellerFilter, setSellerFilter] = useState("all")
  const [selectedAsins, setSelectedAsins] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Get all unique sellers
  const sellers = useMemo(() => {
    const set = new Set<string>()
    Object.values(products).forEach((p) => {
      const last = p.last || (p.points.length ? p.points[p.points.length - 1] : null)
      if (last?.seller) set.add(last.seller.trim())
    })
    return Array.from(set).sort()
  }, [products])

  // Filter products
  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return Object.keys(products).filter((asin) => {
      const prod = products[asin]
      const last = prod.last ||
        (prod.points.length
          ? prod.points[prod.points.length - 1]
          : { raw: "N/A", seller: "N/A", price: 0 })

      const textMatch = (asin + (prod.sku || "") + prod.title + last.seller)
        .toLowerCase()
        .includes(term)

      const isBonolo = last.seller.toLowerCase().includes("bonolo")
      let winMatch = true
      if (winFilter === "win") winMatch = isBonolo
      if (winFilter === "lose") winMatch = !isBonolo && last.seller !== "N/A"

      let sellerMatch = true
      if (sellerFilter !== "all") sellerMatch = last.seller === sellerFilter

      return textMatch && winMatch && sellerMatch
    })
  }, [products, search, winFilter, sellerFilter])

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const pageItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAsins(new Set(pageItems))
    } else {
      setSelectedAsins(new Set())
    }
  }

  const toggleSelect = (asin: string) => {
    const newSet = new Set(selectedAsins)
    if (newSet.has(asin)) {
      newSet.delete(asin)
    } else {
      newSet.add(asin)
    }
    setSelectedAsins(newSet)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-foreground">Full Product Catalog</h2>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search ASIN, SKU, Title, Seller..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-64 px-3 py-2 rounded border border-input bg-background text-foreground"
        />
        <select
          value={winFilter}
          onChange={(e) => setWinFilter(e.target.value)}
          className="px-3 py-2 rounded border border-input bg-background text-foreground"
        >
          <option value="all">All Status</option>
          <option value="win">Buybox Wins</option>
          <option value="lose">Buybox Losses</option>
        </select>
        <select
          value={sellerFilter}
          onChange={(e) => setSellerFilter(e.target.value)}
          className="px-3 py-2 rounded border border-input bg-background text-foreground"
        >
          <option value="all">All Sellers</option>
          {sellers.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() => onRefresh(Array.from(selectedAsins))}
          disabled={selectedAsins.size === 0}
          className="px-4 py-2 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          Refresh Selected ({selectedAsins.size})
        </button>
      </div>

      <p className="font-bold mb-3 text-foreground">{filtered.length} products total</p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-secondary text-secondary-foreground">
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  checked={selectedAsins.size === pageItems.length && pageItems.length > 0}
                />
              </th>
              <th className="p-3 text-left">ASIN</th>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">My Price</th>
              <th className="p-3 text-left">Buy Box Price</th>
              <th className="p-3 text-left">Diff</th>
              <th className="p-3 text-left">Seller</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Last Update</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((asin) => {
              const prod = products[asin]
              const last = prod.last ||
                (prod.points.length
                  ? prod.points[prod.points.length - 1]
                  : { raw: "N/A", seller: "N/A", price: 0, date: "" })
              const diff =
                prod.myPrice && last.price
                  ? (last.price - prod.myPrice).toFixed(2)
                  : "0.00"
              const isBonolo = last.seller.toLowerCase().includes("bonolo")

              return (
                <tr
                  key={asin}
                  className="border-t border-border hover:bg-muted/50 bg-card"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedAsins.has(asin)}
                      onChange={() => toggleSelect(asin)}
                    />
                  </td>
                  <td className="p-3">
                    <a
                      href={`https://www.amazon.co.za/dp/${asin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {asin}
                    </a>
                  </td>
                  <td className="p-3 font-mono text-xs bg-muted/30 rounded">
                    {prod.sku || ""}
                  </td>
                  <td className="p-3 max-w-48 truncate" title={prod.title}>
                    {prod.title.substring(0, 40)}...
                  </td>
                  <td className="p-3">R {prod.myPrice?.toFixed(2) || "0.00"}</td>
                  <td className="p-3">{last.raw}</td>
                  <td
                    className={`p-3 font-bold ${
                      parseFloat(diff) >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {diff}
                  </td>
                  <td
                    className={`p-3 font-bold ${
                      isBonolo ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {last.seller}
                  </td>
                  <td
                    className={`p-3 ${
                      (prod.stock || 0) < 10 ? "text-red-500 font-bold" : ""
                    }`}
                  >
                    {prod.stock || 0}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {last.date ? new Date(last.date).toLocaleString() : ""}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onRefresh([asin])}
                        className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={() => onDelete(asin)}
                        className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs hover:bg-destructive/90"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-muted rounded font-medium disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-muted rounded font-medium disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
