"use client"

import { useState, createContext, useContext } from "react"
import { AppShell } from "./app-shell"
import customersData from "@/lib/data/customers.json"
import type { Customer } from "@/lib/rfm"

interface PulseContextType {
  customers: Customer[]
  businessType: "coffee_shop" | "gym" | "boutique"
  revenueRecovered: number
  wonBackCount: number
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

  const customers = customersData.customers as Customer[]

  const addWonBack = (customer: Customer) => {
    const recovery = customer.avgTransactionValue * 12
    setRevenueRecovered((prev) => prev + recovery)
    setWonBackCount((prev) => prev + 1)
  }

  return (
    <PulseContext.Provider value={{ customers, businessType, revenueRecovered, wonBackCount, addWonBack }}>
      <AppShell
        businessType={businessType}
      >
        {children}
      </AppShell>
    </PulseContext.Provider>
  )
}
