"use client"

import useSWR from "swr"

interface ExchangeRateResult {
  rate: number
  from: string
  to: string
}

const fetcher = async (url: string): Promise<ExchangeRateResult> => {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch" }))
    throw new Error(err.error || "Failed to fetch exchange rate")
  }
  return res.json()
}

export function useExchangeRate(from: string | null, to: string | null) {
  const shouldFetch = from && to && from !== to

  const { data, error, isLoading } = useSWR<ExchangeRateResult>(
    shouldFetch ? `/api/exchange-rate?from=${from}&to=${to}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min dedup
    }
  )

  return {
    rate: from === to ? 1 : (data?.rate ?? null),
    isLoading: shouldFetch ? isLoading : false,
    error: error?.message ?? null,
  }
}
