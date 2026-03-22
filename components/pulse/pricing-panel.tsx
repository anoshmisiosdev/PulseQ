"use client"

import { ExternalLink, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface PricingData {
  product: string
  ourPrice: number
  competitors: {
    amazon?: number
    target?: number
    walmart?: number
  }
  delta: number
  valueMessage: string
  sources: string[]
}

interface PricingPanelProps {
  data: PricingData
  className?: string
}

export function PricingPanel({ data, className }: PricingPanelProps) {
  const isCompetitive = data.delta <= 0
  const TrendIcon = data.delta < 0 ? TrendingDown : data.delta > 0 ? TrendingUp : Minus

  return (
    <div className={cn("glass rounded-xl p-4", className)}>
      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" />
        Competitive Pricing Analysis
      </h3>

      {/* Product & Price */}
      <div className="mb-4">
        <p className="text-lg font-semibold text-foreground">{data.product}</p>
        <p className="text-2xl font-bold text-primary">${data.ourPrice.toFixed(2)}</p>
      </div>

      {/* Competitor Table */}
      <div className="bg-muted/30 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-2 text-muted-foreground font-medium">Retailer</th>
              <th className="text-right p-2 text-muted-foreground font-medium">Price</th>
              <th className="text-right p-2 text-muted-foreground font-medium">Diff</th>
            </tr>
          </thead>
          <tbody>
            {data.competitors.amazon && (
              <tr className="border-b border-border/30">
                <td className="p-2 text-foreground">Amazon</td>
                <td className="p-2 text-right text-foreground">${data.competitors.amazon.toFixed(2)}</td>
                <td
                  className={cn(
                    "p-2 text-right font-medium",
                    data.ourPrice <= data.competitors.amazon
                      ? "text-[oklch(0.65_0.15_155)]"
                      : "text-[oklch(0.60_0.20_25)]"
                  )}
                >
                  {data.ourPrice <= data.competitors.amazon ? "-" : "+"}$
                  {Math.abs(data.ourPrice - data.competitors.amazon).toFixed(2)}
                </td>
              </tr>
            )}
            {data.competitors.target && (
              <tr className="border-b border-border/30">
                <td className="p-2 text-foreground">Target</td>
                <td className="p-2 text-right text-foreground">${data.competitors.target.toFixed(2)}</td>
                <td
                  className={cn(
                    "p-2 text-right font-medium",
                    data.ourPrice <= data.competitors.target
                      ? "text-[oklch(0.65_0.15_155)]"
                      : "text-[oklch(0.60_0.20_25)]"
                  )}
                >
                  {data.ourPrice <= data.competitors.target ? "-" : "+"}$
                  {Math.abs(data.ourPrice - data.competitors.target).toFixed(2)}
                </td>
              </tr>
            )}
            {data.competitors.walmart && (
              <tr>
                <td className="p-2 text-foreground">Walmart</td>
                <td className="p-2 text-right text-foreground">${data.competitors.walmart.toFixed(2)}</td>
                <td
                  className={cn(
                    "p-2 text-right font-medium",
                    data.ourPrice <= data.competitors.walmart
                      ? "text-[oklch(0.65_0.15_155)]"
                      : "text-[oklch(0.60_0.20_25)]"
                  )}
                >
                  {data.ourPrice <= data.competitors.walmart ? "-" : "+"}$
                  {Math.abs(data.ourPrice - data.competitors.walmart).toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Value Message */}
      <div
        className={cn(
          "rounded-lg p-3 flex items-start gap-2",
          isCompetitive ? "bg-[oklch(0.65_0.15_155)]/10" : "bg-[oklch(0.75_0.15_65)]/10"
        )}
      >
        <TrendIcon
          className={cn(
            "w-4 h-4 mt-0.5 flex-shrink-0",
            isCompetitive ? "text-[oklch(0.65_0.15_155)]" : "text-[oklch(0.75_0.15_65)]"
          )}
        />
        <p
          className={cn(
            "text-sm",
            isCompetitive ? "text-[oklch(0.50_0.12_155)]" : "text-[oklch(0.55_0.12_65)]"
          )}
        >
          {data.valueMessage}
        </p>
      </div>

      {/* Sources */}
      {data.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.sources.map((source, i) => (
            <a
              key={i}
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Source {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// Example usage with mock data
export const mockPricingData: PricingData = {
  product: "Cold Brew (16oz)",
  ourPrice: 4.50,
  competitors: {
    amazon: 5.25,
    target: 5.40,
    walmart: 5.10,
  },
  delta: -0.60,
  valueMessage: "You're $0.60 cheaper than the lowest competitor. Lead with freshness and local quality.",
  sources: ["https://amazon.com/cold-brew", "https://target.com/cold-brew"],
}
