import { NextResponse } from "next/server"

// Cache exchange rates for 10 minutes to avoid hammering the API
const rateCache: Record<string, { rate: number; fetchedAt: number }> = {}
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")?.toUpperCase()
  const to = searchParams.get("to")?.toUpperCase()

  if (!from || !to) {
    return NextResponse.json({ error: "Missing 'from' and 'to' query parameters" }, { status: 400 })
  }

  if (from === to) {
    return NextResponse.json({ rate: 1, from, to })
  }

  const cacheKey = `${from}_${to}`
  const cached = rateCache[cacheKey]
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ rate: cached.rate, from, to, cached: true })
  }

  try {
    // Primary: Open Exchange Rates API (free, no key required)
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      next: { revalidate: 600 }, // cache for 10 min at edge
    })

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`)
    }

    const data = await res.json()

    if (data.result === "error") {
      throw new Error(data["error-type"] || "Unknown API error")
    }

    const rate = data.rates?.[to]
    if (rate === undefined) {
      return NextResponse.json(
        { error: `Currency '${to}' not found in exchange rates` },
        { status: 404 }
      )
    }

    // Cache it
    rateCache[cacheKey] = { rate, fetchedAt: Date.now() }

    return NextResponse.json({ rate, from, to })
  } catch (err) {
    // Fallback: try the secondary API
    try {
      const fromLower = from.toLowerCase()
      const toLower = to.toLowerCase()
      const res2 = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fromLower}.json`,
        { next: { revalidate: 600 } }
      )

      if (!res2.ok) throw new Error("Fallback API failed")

      const data2 = await res2.json()
      const rate = data2[fromLower]?.[toLower]

      if (rate === undefined) {
        return NextResponse.json(
          { error: `Could not find rate for ${from} to ${to}` },
          { status: 404 }
        )
      }

      rateCache[cacheKey] = { rate, fetchedAt: Date.now() }
      return NextResponse.json({ rate, from, to, fallback: true })
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch exchange rate from all sources" },
        { status: 502 }
      )
    }
  }
}
