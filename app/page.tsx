"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useDashboardStore } from "@/lib/store"
import { StatCard } from "@/components/stat-card"
import { ProgressBar } from "@/components/progress-bar"
import { ProductCard } from "@/components/product-card"
import { ProductsTable } from "@/components/products-table"
import { AnalysisView } from "@/components/analysis-view"
import { ImportView } from "@/components/import-view"
import { DebugLog } from "@/components/debug-log"

type Tab = "home" | "table" | "analysis" | "import"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [asinInput, setAsinInput] = useState("")
  const [showDebug, setShowDebug] = useState(false)

  const {
    products,
    serverStatus,
    isRefreshing,
    progress,
    debugLogs,
    initProducts,
    setServerStatus,
    addLog,
    addASINs,
    refreshAll,
    refreshSelected,
    deleteProduct,
    importCSV,
  } = useDashboardStore()

  // Initialize on mount
  useEffect(() => {
    addLog("Booting Dashboard...")
    initProducts()
    addLog("Products loaded from storage")

    // Check server status
    const checkStatus = async () => {
      try {
        const resp = await fetch("/api/health")
        if (resp.ok) {
          setServerStatus("online")
          addLog("Server is online")
        } else {
          setServerStatus("offline")
          addLog("Server returned error", true)
        }
      } catch {
        setServerStatus("offline")
        addLog("Server connection failed", true)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [initProducts, setServerStatus, addLog])

  // Calculate stats
  const stats = useMemo(() => {
    const asins = Object.keys(products)
    const total = asins.length
    let weWin = 0

    asins.forEach((asin) => {
      const prod = products[asin]
      const last = prod.last ||
        (prod.points.length ? prod.points[prod.points.length - 1] : null)
      if (last && last.seller.toLowerCase().includes("bonolo")) {
        weWin++
      }
    })

    return {
      total,
      weWin,
      weLose: total - weWin,
      winPct: total ? Math.round((weWin / total) * 100) + "%" : "0%",
    }
  }, [products])

  const handleAddAndRefresh = useCallback(async () => {
    const asins = [...new Set(
      asinInput
        .trim()
        .split(/\s+/)
        .filter((a) => a.length === 10)
    )]
    if (asins.length === 0) return

    const result = await addASINs(asins)
    setAsinInput("")
    if (result.failed > 0) {
      alert(`Completed with ${result.failed} failures. Try refreshing those manually.`)
    }
  }, [asinInput, addASINs])

  const handleRefreshAll = useCallback(async () => {
    const result = await refreshAll()
    if (result.failed > 0) {
      alert(`Refresh complete. ${result.failed} products could not be updated.`)
    }
  }, [refreshAll])

  const handleRefreshSelected = useCallback(
    async (asins: string[]) => {
      if (asins.length === 0) {
        alert("Select products first")
        return
      }
      const result = await refreshSelected(asins)
      if (result.failed > 0) {
        alert(`Refresh complete. ${result.failed} products failed to update.`)
      }
    },
    [refreshSelected]
  )

  const handleDeleteProduct = useCallback(
    (asin: string) => {
      if (confirm(`Delete ${asin}?`)) {
        deleteProduct(asin)
      }
    },
    [deleteProduct]
  )

  const handleExportHistory = useCallback(() => {
    const data = Object.keys(products).map((asin) => {
      const p = products[asin]
      return `${asin},${p.sku || ""},${p.title.replace(/,/g, " ")},${p.myPrice},${p.stock || 0}`
    })
    const csv = "ASIN,SKU,Title,My Selling,Stock\n" + data.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `amazon_backup_${new Date().toISOString().split("T")[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [products])

  const tabs: { id: Tab; label: string }[] = [
    { id: "home", label: "Dashboard" },
    { id: "table", label: "Products Table" },
    { id: "analysis", label: "Analysis" },
    { id: "import", label: "Bulk Import" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary text-secondary-foreground p-4 text-center relative">
        <h1 className="text-2xl font-bold">Amazon.co.za Buy Box Dashboard (v5.0)</h1>
        <div
          className={`absolute top-4 right-4 text-sm px-3 py-1 rounded ${
            serverStatus === "online"
              ? "bg-green-600 text-white"
              : serverStatus === "offline"
              ? "bg-red-600 text-white"
              : "bg-gray-600 text-white"
          }`}
        >
          {serverStatus === "online"
            ? "Server Online"
            : serverStatus === "offline"
            ? "Server Offline"
            : "Connecting..."}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-card border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 font-bold transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            } rounded-t-lg mr-1`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-5">
        {/* Dashboard Tab */}
        {activeTab === "home" && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <StatCard value={stats.total} label="Total Products" />
              <StatCard value={stats.weWin} label="We Win" />
              <StatCard value={stats.weLose} label="We Lose" />
              <StatCard value={stats.weWin} label="Bonolo Wins" />
              <StatCard value={stats.winPct} label="Win %" />
            </div>

            {/* Input Area */}
            <div className="bg-card rounded-lg p-5 shadow-md mb-5">
              <label className="font-bold text-foreground block mb-3">
                Add ASINs (one per line)
              </label>
              <textarea
                value={asinInput}
                onChange={(e) => setAsinInput(e.target.value)}
                placeholder="B01ARGZO2K..."
                className="w-full h-24 p-3 border border-input rounded-lg bg-background text-foreground resize-none mb-3"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAddAndRefresh}
                  disabled={isRefreshing}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Add & Refresh New
                </button>
                <button
                  onClick={handleRefreshAll}
                  disabled={isRefreshing}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Refresh All
                </button>
                <button
                  onClick={handleExportHistory}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                >
                  Export History CSV
                </button>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="px-6 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80"
                >
                  {showDebug ? "Hide Logs" : "Show Logs"}
                </button>
              </div>
            </div>

            <ProgressBar progress={progress} visible={isRefreshing} />
            <DebugLog logs={debugLogs} visible={showDebug} />

            {/* Product Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
              {Object.keys(products).map((asin) => (
                <ProductCard
                  key={asin}
                  asin={asin}
                  product={products[asin]}
                  onRefresh={(a) => handleRefreshSelected([a])}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>

            {Object.keys(products).length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-xl mb-2">No products yet</p>
                <p>Add ASINs above to start tracking Buy Box prices</p>
              </div>
            )}
          </div>
        )}

        {/* Products Table Tab */}
        {activeTab === "table" && (
          <ProductsTable
            products={products}
            onRefresh={handleRefreshSelected}
            onDelete={handleDeleteProduct}
          />
        )}

        {/* Analysis Tab */}
        {activeTab === "analysis" && <AnalysisView products={products} />}

        {/* Import Tab */}
        {activeTab === "import" && <ImportView onImport={importCSV} />}
      </main>
    </div>
  )
}
