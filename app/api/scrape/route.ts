import { NextRequest, NextResponse } from "next/server"

// Use Browserless.io for cloud-based browser automation
const BROWSERLESS_URL = process.env.BROWSERLESS_API_KEY
  ? `wss://production-sfo.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`
  : null

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get("url")

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  console.log("[v0] Scraping URL:", targetUrl)

  try {
    // If we have Browserless configured, use Puppeteer
    if (BROWSERLESS_URL) {
      const puppeteer = await import("puppeteer-core")
      let browser = null

      try {
        browser = await puppeteer.default.connect({
          browserWSEndpoint: BROWSERLESS_URL,
        })

        const page = await browser.newPage()

        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        await page.setViewport({ width: 1280, height: 720 })

        await page.goto(targetUrl, {
          waitUntil: "networkidle2",
          timeout: 45000,
        })

        // Wait for dynamic content
        await new Promise((r) => setTimeout(r, 2000))

        const content = await page.content()
        console.log("[v0] Scrape successful, bytes:", content.length)

        return new NextResponse(content, {
          headers: { "Content-Type": "text/html" },
        })
      } finally {
        if (browser) {
          await browser.close()
        }
      }
    }

    // Fallback: Use fetch with browser-like headers (works for many pages)
    console.log("[v0] Using fetch fallback (no Browserless key)")
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
    })

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`)
    }

    const content = await response.text()
    console.log("[v0] Fetch successful, bytes:", content.length)

    return new NextResponse(content, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error("[v0] Scrape error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scrape failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Support POST for larger payloads
  const body = await request.json()
  const targetUrl = body.url

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url in body" }, { status: 400 })
  }

  // Redirect to GET handler logic
  const url = new URL(request.url)
  url.searchParams.set("url", targetUrl)

  return GET(new NextRequest(url))
}
