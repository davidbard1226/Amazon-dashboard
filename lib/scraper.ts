import type { Product, ProductMap } from "./types"

const STORAGE_KEY = "amazon_za_perfect_final"

export function parsePrice(str: string): number {
  if (!str || str === "N/A" || str === "") return 0
  let clean = str.replace(/[^\d,.]/g, "").replace(/\s/g, "")

  if (clean.includes(",") && clean.includes(".")) {
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0
    } else {
      return parseFloat(clean.replace(/,/g, "")) || 0
    }
  }
  if (clean.includes(",")) {
    const parts = clean.split(",")
    if (parts[parts.length - 1].length <= 2) {
      return parseFloat(clean.replace(",", ".")) || 0
    } else {
      return parseFloat(clean.replace(",", "")) || 0
    }
  }
  return parseFloat(clean) || 0
}

export function loadProducts(): ProductMap {
  if (typeof window === "undefined") return {}
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
  } catch (e) {
    console.error("Failed to load products:", e)
    localStorage.removeItem(STORAGE_KEY)
  }
  return {}
}

export function saveProducts(products: ProductMap): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
}

export async function fetchWithProxy(url: string): Promise<string | null> {
  try {
    const proxyUrl = `/api/scrape?url=${encodeURIComponent(url)}`
    const resp = await fetch(proxyUrl)
    if (resp.ok) return await resp.text()
    console.error("Proxy failed:", resp.status)
    return null
  } catch (e) {
    console.error("Fetch error:", e)
    return null
  }
}

export async function scrapeASIN(
  asin: string,
  allProducts: ProductMap
): Promise<Product | null> {
  console.log(`Scraping ${asin}...`)
  const url = `https://www.amazon.co.za/dp/${asin}`
  const html = await fetchWithProxy(url)
  if (!html) return null

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  // Check for CAPTCHA or blocking
  if (
    html.includes("api-services-support@amazon.com") ||
    html.includes("captcha") ||
    html.includes("automated access")
  ) {
    console.error(`[Scraper] ${asin}: Blocked or CAPTCHA detected!`)
    return null
  }

  // TITLE
  let title = allProducts[asin]?.title || "ASIN: " + asin
  const titleEl =
    doc.getElementById("productTitle") ||
    doc.querySelector('meta[name="title"]')
  if (titleEl) {
    const rawTitle = (
      (titleEl as HTMLElement).textContent ||
      (titleEl as HTMLMetaElement).content ||
      ""
    )
      .replace(/Amazon.co.za:|: Amazon.co.za: Books/g, "")
      .trim()
    if (rawTitle.length > 5) title = rawTitle
  }

  // Check for price on main page
  const mainPriceBlock = doc.querySelector(
    "#corePrice_feature_div, #apex_desktop, #unifiedPrice_feature_div, #corePriceDisplay_desktop_feature_div"
  )
  const hasPriceOnMain = mainPriceBlock?.querySelector(".a-price")

  let price = "N/A"
  let seller = "Amazon.co.za"

  const useOfferListing = !hasPriceOnMain

  if (useOfferListing) {
    console.log(`${asin}: Checking All Offers...`)
    const offerUrl = `https://www.amazon.co.za/gp/offer-listing/${asin}`
    const offerHtml = await fetchWithProxy(offerUrl)
    if (offerHtml) {
      const offerDoc = parser.parseFromString(offerHtml, "text/html")

      let b: Element | null = offerDoc.querySelector(
        "#aod-pinned-offer:not(.aok-hidden)"
      )
      if (!b || b.textContent?.includes("No featured offers")) {
        b =
          offerDoc.querySelector("#aod-offer") ||
          offerDoc.querySelector(".olpOffer")
      }

      if (b) {
        const pEl = b.querySelector(".a-price .a-offscreen")
        if (pEl) price = pEl.textContent?.trim() || "N/A"

        const sLink = Array.from(
          b.querySelectorAll(
            'a[href*="seller="], a[aria-label*="sold by"], a[aria-label*="Opens a new page"], #aod-offer-soldBy a'
          )
        ).find((el) => {
          const t = el.textContent?.trim() || ""
          return (
            t &&
            t !== "Details" &&
            t !== "Return details" &&
            !t.includes("delivery costs")
          )
        })

        const potentialSeller = sLink ? sLink.textContent?.trim() : ""

        if (potentialSeller && potentialSeller.length > 1) {
          seller = potentialSeller
        } else {
          const text = (b as HTMLElement).innerText || b.textContent || ""
          const m = text.match(/Sold by\s+([^.\n|,\r\t]+)/i)
          if (m && m[1].trim().length > 1) {
            seller = m[1].trim()
          } else if (
            text.includes("Sold by Amazon") ||
            text.includes("Ships from Amazon")
          ) {
            seller = "Amazon.co.za"
          }
        }
      }
    }
  }

  // If price is still N/A, try main page
  if (price === "N/A" && hasPriceOnMain && mainPriceBlock) {
    const p = mainPriceBlock.querySelector(".a-price .a-offscreen")
    if (p) price = p.textContent?.trim() || "N/A"
    const s = doc.querySelector("#merchant-info a, #sellerProfileTriggerId")
    if (s) seller = s.textContent?.trim() || seller
  }

  const priceNum = parsePrice(price)
  const now = new Date().toISOString()

  if (!allProducts[asin]) {
    allProducts[asin] = { title, points: [], sku: "", myPrice: 0, stock: 0 }
  }

  allProducts[asin].title = title
  allProducts[asin].points.push({ date: now, price: priceNum, raw: price, seller })
  if (allProducts[asin].points.length > 100) allProducts[asin].points.shift()

  allProducts[asin].last = { price: priceNum, raw: price, seller, date: now }
  saveProducts(allProducts)

  return allProducts[asin]
}
