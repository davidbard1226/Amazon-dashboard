"use client"

import { create } from "zustand"
import type { ProductMap } from "./types"
import { loadProducts, saveProducts, scrapeASIN } from "./scraper"

interface DashboardState {
  products: ProductMap
  serverStatus: "connecting" | "online" | "offline"
  isRefreshing: boolean
  progress: number
  debugLogs: Array<{ message: string; isError: boolean; time: Date }>
  
  // Actions
  initProducts: () => void
  setServerStatus: (status: "connecting" | "online" | "offline") => void
  addLog: (message: string, isError?: boolean) => void
  clearLogs: () => void
  
  // Product actions
  addASINs: (asins: string[]) => Promise<{ failed: number }>
  refreshAll: () => Promise<{ failed: number }>
  refreshSelected: (asins: string[]) => Promise<{ failed: number }>
  deleteProduct: (asin: string) => void
  importCSV: (data: Array<{ asin: string; sku?: string; title?: string; myPrice?: number; stock?: number }>) => void
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  products: {},
  serverStatus: "connecting",
  isRefreshing: false,
  progress: 0,
  debugLogs: [],

  initProducts: () => {
    const products = loadProducts()
    set({ products })
  },

  setServerStatus: (status) => set({ serverStatus: status }),

  addLog: (message, isError = false) => {
    set((state) => ({
      debugLogs: [{ message, isError, time: new Date() }, ...state.debugLogs].slice(0, 100),
    }))
  },

  clearLogs: () => set({ debugLogs: [] }),

  addASINs: async (asins) => {
    set({ isRefreshing: true, progress: 0 })
    const { products, addLog } = get()
    let failed = 0

    for (let i = 0; i < asins.length; i++) {
      const asin = asins[i]
      addLog(`Scraping ${asin}...`)
      const result = await scrapeASIN(asin, products)
      if (!result) {
        failed++
        addLog(`Failed to scrape ${asin}`, true)
      } else {
        addLog(`Successfully scraped ${asin}`)
      }
      set({ progress: Math.round(((i + 1) / asins.length) * 100), products: { ...products } })
      if (i < asins.length - 1) await new Promise((r) => setTimeout(r, 500))
    }

    set({ isRefreshing: false, progress: 0 })
    return { failed }
  },

  refreshAll: async () => {
    const { products } = get()
    const asins = Object.keys(products)
    if (asins.length === 0) return { failed: 0 }
    return get().addASINs(asins)
  },

  refreshSelected: async (asins) => {
    if (asins.length === 0) return { failed: 0 }
    return get().addASINs(asins)
  },

  deleteProduct: (asin) => {
    const { products } = get()
    delete products[asin]
    saveProducts(products)
    set({ products: { ...products } })
  },

  importCSV: (data) => {
    const { products, addLog } = get()
    data.forEach((row) => {
      const asin = row.asin?.trim()
      if (!asin || asin.length !== 10) return
      if (!products[asin]) {
        products[asin] = {
          title: row.title || asin,
          points: [],
          sku: "",
          myPrice: 0,
          stock: 0,
        }
      }
      if (row.sku) products[asin].sku = row.sku
      if (row.myPrice) products[asin].myPrice = row.myPrice
      if (row.stock) products[asin].stock = row.stock
    })
    saveProducts(products)
    set({ products: { ...products } })
    addLog(`Imported ${data.length} products`)
  },
}))
