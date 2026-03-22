"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { AppShell } from "./app-shell"
import type { Customer } from "@/lib/rfm"

interface BusinessData {
  name: string
  type: string
  tone: string
  voiceId: string
  voiceName: string
  discountBudget: number
  avgTransactionValue: number
  customerLifetimeValue: number
  emailSignoff: string
  emailOpening: string
  productLanguage: string
}

interface ProductData {
  id: string
  name: string
  price: number
  category: string
  launched: string
  margin: number
}

interface PulseContextType {
  customers: Customer[]
  businessType: "coffee_shop" | "gym" | "boutique"
  businessData: Record<string, BusinessData>
  catalogData: ProductData[]
  revenueRecovered: number
  wonBackCount: number
  wonBackIds: Set<string>
  addWonBack: (customer: Customer) => void
}

const PulseContext = createContext<PulseContextType | null>(null)

export function usePulse() {
  const ctx = useContext(PulseContext)
  if (!ctx) throw new Error("usePulse must be used within ClientLayout")
  return ctx
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [businessType, setBusinessType] = useState<"coffee_shop" | "gym" | "boutique">("coffee_shop")
  const [revenueRecovered, setRevenueRecovered] = useState(0)
  const [wonBackCount, setWonBackCount] = useState(0)
  const [wonBackIds, setWonBackIds] = useState<Set<string>>(new Set())
  const [customers, setCustomers] = useState<Customer[]>([])
  const [businessData, setBusinessData] = useState<Record<string, BusinessData>>({})
  const [catalogData, setCatalogData] = useState<ProductData[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/businesses").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([custData, bizData, prodData]) => {
      setCustomers(custData.customers || custData)
      setBusinessData(bizData)
      setCatalogData(prodData)
      setLoaded(true)
    })
  }, [])

  const addWonBack = (customer: Customer) => {
    const recovery = customer.avgTransactionValue * 12
    setRevenueRecovered((prev) => prev + recovery)
    setWonBackCount((prev) => prev + 1)
    setWonBackIds((prev) => new Set(prev).add(customer.id))
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
          Loading Pulse...
        </div>
      </div>
    )
  }

  return (
    <PulseContext.Provider value={{ customers, businessType, businessData, catalogData, revenueRecovered, wonBackCount, wonBackIds, addWonBack }}>
      <AppShell businessType={businessType}>
        {children}
      </AppShell>
    </PulseContext.Provider>
  )
}
