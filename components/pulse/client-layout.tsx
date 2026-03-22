"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { AppShell } from "./app-shell"
import customersData from "@/lib/data/customers.json"
import type { Customer } from "@/lib/rfm"

export interface BusinessProfile {
  location: string
  description: string
  popularProducts: string[]
}

interface PulseContextType {
  customers: Customer[]
  businessType: "coffee_shop" | "gym" | "boutique"
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

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [businessType, setBusinessType] = useState<"coffee_shop" | "gym" | "boutique">("coffee_shop")
  const [revenueRecovered, setRevenueRecovered] = useState(0)
  const [wonBackCount, setWonBackCount] = useState(0)
  const [wonBackIds, setWonBackIds] = useState<Set<string>>(new Set())
  const [businessProfile, setBusinessProfileState] = useState<BusinessProfile>({
    location: "",
    description: "",
    popularProducts: [],
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY)
      if (saved) setBusinessProfileState(JSON.parse(saved))
    } catch {}
  }, [])

  const setBusinessProfile = (profile: BusinessProfile) => {
    setBusinessProfileState(profile)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  }

  const customers = customersData as unknown as Customer[]

  const addWonBack = (customer: Customer) => {
    const recovery = customer.avgTransactionValue * 12
    setRevenueRecovered((prev) => prev + recovery)
    setWonBackCount((prev) => prev + 1)
    setWonBackIds((prev) => new Set(prev).add(customer.id))
  }

  return (
    <PulseContext.Provider value={{ customers, businessType, revenueRecovered, wonBackCount, wonBackIds, addWonBack, businessProfile, setBusinessProfile }}>
      <AppShell
        businessType={businessType}
      >
        {children}
      </AppShell>
    </PulseContext.Provider>
  )
}

