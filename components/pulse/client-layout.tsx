"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { AppShell } from "./app-shell"
import type { Customer } from "@/lib/rfm"
import rawCustomers from "@/lib/data/customers.json"
import rawBusiness from "@/lib/data/business.json"
import rawCatalog from "@/lib/data/catalog.json"

export interface BusinessProfile {
  location: string
  description: string
  popularProducts: string[]
}

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
  businessProfile: BusinessProfile
  setBusinessProfile: (profile: BusinessProfile) => void
}

const PulseContext = createContext<PulseContextType | null>(null)

export function usePulse() {
  const ctx = useContext(PulseContext)
  if (!ctx) throw new Error("usePulse must be used within ClientLayout")
  return ctx
}

const PROFILE_KEY = "pulse-business-profile"

const defaultProfile: BusinessProfile = {
  location: "",
  description: "",
  popularProducts: [],
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [businessType] = useState<"coffee_shop" | "gym" | "boutique">("coffee_shop")
  const [revenueRecovered, setRevenueRecovered] = useState(0)
  const [wonBackCount, setWonBackCount] = useState(0)
  const [wonBackIds, setWonBackIds] = useState<Set<string>>(new Set())
  const [businessProfile, setBusinessProfileState] = useState<BusinessProfile>(defaultProfile)
  const [loaded, setLoaded] = useState(false)

  const customers = rawCustomers as unknown as Customer[]
  const businessData = rawBusiness as Record<string, BusinessData>
  const catalogData = rawCatalog as ProductData[]

  // Load business profile from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY)
      if (saved) {
        setBusinessProfileState(JSON.parse(saved))
      }
    } catch {}
    setLoaded(true)
  }, [])

  const setBusinessProfile = (profile: BusinessProfile) => {
    setBusinessProfileState(profile)
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    } catch {}
  }

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
    <PulseContext.Provider
      value={{
        customers,
        businessType,
        businessData,
        catalogData,
        revenueRecovered,
        wonBackCount,
        wonBackIds,
        addWonBack,
        businessProfile,
        setBusinessProfile,
      }}
    >
      <AppShell businessType={businessType}>
        {children}
      </AppShell>
    </PulseContext.Provider>
  )
}
