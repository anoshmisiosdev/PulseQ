"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ShoppingBag, RefreshCw, ExternalLink, TrendingDown, TrendingUp, Minus, AlertCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"


interface MarketData {
  product: string
  ourPrice: number | null
  prices: { name: string, price: number }[]
  delta: number | null
  citations: string[]
  source: "perplexity_live" | "fallback_static" | "cache"
  loading: boolean
  error: boolean
}

function getPctDiff(yourPrice: number, lowestMarket: number): number {
  return ((yourPrice - lowestMarket) / lowestMarket) * 100
}

function getLowestMarket(data: MarketData): number | null {
  const prices = data.prices.map(p => p.price).filter((p): p is number => p != null)
  return prices.length > 0 ? Math.min(...prices) : null
}

function PriceBadge({ label, price }: { label: string; price: number | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: price != null ? "#0f172a" : "#cbd5e1" }}>
        {price != null ? `$${price.toFixed(2)}` : "N/A"}
      </span>
    </div>
  )
}

function DeltaBadge({ yourPrice, data }: { yourPrice: string; data: MarketData }) {
  const parsed = parseFloat(yourPrice)
  const lowest = getLowestMarket(data)

  if (!yourPrice || isNaN(parsed) || parsed <= 0 || lowest == null) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-3 py-1"
        style={{ background: "rgba(148,163,184,0.12)", color: "#94a3b8", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13 }}
      >
        <Minus className="w-3.5 h-3.5" />
        Enter your price
      </span>
    )
  }

  const pct = getPctDiff(parsed, lowest)
  const cheaper = pct < 0
  const even = Math.abs(pct) < 1

  if (even) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-3 py-1"
        style={{ background: "rgba(148,163,184,0.12)", color: "#64748b", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13 }}
      >
        <Minus className="w-3.5 h-3.5" />
        At market ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)
      </span>
    )
  }

  if (cheaper) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-3 py-1"
        style={{ background: "rgba(16,185,129,0.12)", color: "#059669", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13 }}
      >
        <TrendingDown className="w-3.5 h-3.5" />
        {pct.toFixed(1)}% cheaper
      </span>
    )
  }

  const hot = pct >= 10
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1"
      style={{
        background: hot ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
        color: hot ? "#dc2626" : "#d97706",
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      <TrendingUp className="w-3.5 h-3.5" />
      +{pct.toFixed(1)}% vs market
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-36 rounded-lg" style={{ background: "rgba(148,163,184,0.2)" }} />
        <div className="h-5 w-16 rounded-full" style={{ background: "rgba(148,163,184,0.12)" }} />
      </div>
      <div className="grid grid-cols-3 gap-4 py-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-3 w-12 rounded" style={{ background: "rgba(148,163,184,0.15)" }} />
            <div className="h-7 w-16 rounded-lg" style={{ background: "rgba(148,163,184,0.2)" }} />
          </div>
        ))}
      </div>
      <div className="h-10 rounded-xl" style={{ background: "rgba(148,163,184,0.12)" }} />
      <div className="h-7 w-40 rounded-full" style={{ background: "rgba(148,163,184,0.12)" }} />
    </div>
  )
}

function ProductCard({ data, yourPrice, onPriceChange }: {
  data: MarketData
  yourPrice: string
  onPriceChange: (val: string) => void
}) {
  const lowest = getLowestMarket(data)

  return (
    <div
      className="glass-card p-5 space-y-4 animate-fade-up"
      style={{ borderRadius: 20 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#0f172a", letterSpacing: "-0.01em" }}>
            {data.product}
          </h3>
          {lowest != null && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              Lowest market: <span style={{ color: "#0891b2", fontWeight: 600 }}>${lowest.toFixed(2)}</span>
            </p>
          )}
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs shrink-0"
          style={{
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            background: data.source === "perplexity_live" ? "rgba(8,145,178,0.1)" : data.source === "cache" ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.12)",
            color: data.source === "perplexity_live" ? "#0891b2" : data.source === "cache" ? "#059669" : "#94a3b8",
          }}
        >
          {data.source === "perplexity_live" ? "● Live" : data.source === "cache" ? "● Cached" : "Fallback"}
        </span>
      </div>

      {/* Retailer price row */}
      {data.error ? (
        <div
          className="flex items-center gap-2 py-3 px-4 rounded-xl"
          style={{ background: "rgba(239,68,68,0.06)", color: "#dc2626" }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13 }}>Couldn&apos;t fetch market prices for this product.</span>
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-2 rounded-2xl py-4 px-2"
          style={{ background: "rgba(241,245,249,0.6)" }}
        >
          {data.prices.map((p, idx) => (
            <PriceBadge key={idx} label={p.name} price={p.price} />
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(226,232,240,0.8)" }} />

      {/* Your Price input */}
      <div className="space-y-2">
        <label style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 12, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Your Price
        </label>
        <div className="relative">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 16, color: "#94a3b8" }}
          >
            $
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={yourPrice}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-3 rounded-xl glass-inset text-sm focus:outline-none focus:ring-2 focus:ring-[#0891b2]/40 transition-shadow"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 18,
              color: "#0f172a",
              borderRadius: 12,
            }}
          />
        </div>
      </div>

      {/* Delta badge */}
      <div>
        <DeltaBadge yourPrice={yourPrice} data={data} />
      </div>

      {/* Citations link */}
      {data.citations && data.citations.length > 0 && (
        <a
          href={data.citations[0]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs hover:underline"
          style={{ fontFamily: "var(--font-body)", color: "#94a3b8" }}
        >
          <ExternalLink className="w-3 h-3" /> Source
        </a>
      )}
    </div>
  )
}

export default function PricesPage() {
  const [products, setProducts] = useState<string[]>([])
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [yourPrices, setYourPrices] = useState<Record<string, string>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load products from DB profile
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((profile) => {
        setProducts(profile.popularProducts || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const fetchMarketData = useCallback(async (productList: string[], forceRefresh: boolean = false) => {
    if (productList.length === 0) return

    // Initialise loading states
    setMarketData(
      productList.map((p) => ({
        product: p,
        ourPrice: null,
        prices: [],
        delta: null,
        citations: [],
        source: "fallback_static",
        loading: true,
        error: false,
      }))
    )

    const results = await Promise.allSettled(
      productList.map((product) =>
        fetch("/api/market-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, ourPrice: null, forceRefresh }),
        }).then((r) => r.json())
      )
    )

    setMarketData(
      productList.map((product, i) => {
        const result = results[i]
        if (result.status === "fulfilled") {
          const d = result.value
          return {
            product,
            ourPrice: d.ourPrice,
            prices: d.prices || [],
            delta: d.delta ?? null,
            citations: d.citations || [],
            source: d.source || "fallback_static",
            loading: false,
            error: false,
          }
        }
        return {
          product,
          ourPrice: null,
          prices: [],
          delta: null,
          citations: [],
          source: "fallback_static",
          loading: false,
          error: true,
        }
      })
    )
  }, [])

  useEffect(() => {
    if (products.length > 0) {
      fetchMarketData(products)
    }
  }, [products, fetchMarketData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchMarketData(products, true)
    setIsRefreshing(false)
  }

  const handlePriceChange = (product: string, value: string) => {
    setYourPrices((prev) => ({ ...prev, [product]: value }))
  }

  const isLoading = marketData.some((d) => d.loading)

  if (!loaded) return null

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, lineHeight: 1.2, letterSpacing: "-0.02em", color: "#0f172a" }}>
            Price Comparisons
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 14, color: "#475569", marginTop: 4 }}>
            AI-powered local competitor prices — enter your price to see how you stack up.
          </p>
        </div>
        {products.length > 0 && (
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90 press-scale shrink-0",
              (isLoading || isRefreshing) && "opacity-60 cursor-not-allowed"
            )}
            style={{ background: "#0891b2", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, boxShadow: "0 4px 12px rgba(8,145,178,0.2)" }}
          >
            <RefreshCw className={cn("w-4 h-4", (isLoading || isRefreshing) && "animate-spin")} />
            Refresh Prices
          </button>
        )}
      </div>

      {/* Empty state */}
      {loaded && products.length === 0 && (
        <div
          className="glass-card p-10 flex flex-col items-center text-center gap-4"
          style={{ borderRadius: 20 }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(8,145,178,0.1)" }}>
            <ShoppingBag className="w-7 h-7 text-[#0891b2]" />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#0f172a" }}>No products yet</p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#94a3b8", marginTop: 4 }}>
              Add your popular products on the Business page to start comparing prices.
            </p>
          </div>
          <Link
            href="/business"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition-all"
            style={{ background: "#0891b2", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14 }}
          >
            Go to Business <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Cards grid */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading
            ? products.map((p) => <SkeletonCard key={p} />)
            : marketData.map((data) => (
                <ProductCard
                  key={data.product}
                  data={data}
                  yourPrice={yourPrices[data.product] ?? ""}
                  onPriceChange={(val) => handlePriceChange(data.product, val)}
                />
              ))}
        </div>
      )}
    </div>
  )
}
