"use client"

import { useState, useEffect, useCallback } from "react"
import { MapPin, FileText, ShoppingBag, Plus, X, Save, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BusinessProfile {
  location: string
  description: string
  popularProducts: string[]
}

const STORAGE_KEY = "pulse-business-profile"

function loadProfile(): BusinessProfile {
  if (typeof window === "undefined") return { location: "", description: "", popularProducts: [] }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { location: "", description: "", popularProducts: [] }
}

export default function BusinessPage() {
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [popularProducts, setPopularProducts] = useState<string[]>([])
  const [newProduct, setNewProduct] = useState("")
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const profile = loadProfile()
    setLocation(profile.location)
    setDescription(profile.description)
    setPopularProducts(profile.popularProducts)
  }, [])

  const addProduct = useCallback(() => {
    const trimmed = newProduct.trim()
    if (trimmed && !popularProducts.includes(trimmed)) {
      setPopularProducts((prev) => [...prev, trimmed])
      setNewProduct("")
      setErrors((prev) => ({ ...prev, products: false }))
    }
  }, [newProduct, popularProducts])

  const removeProduct = (product: string) => {
    setPopularProducts((prev) => prev.filter((p) => p !== product))
  }

  const handleSave = () => {
    const newErrors: Record<string, boolean> = {}
    if (!location.trim()) newErrors.location = true
    if (!description.trim()) newErrors.description = true
    if (popularProducts.length === 0) newErrors.products = true

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const profile: BusinessProfile = {
      location: location.trim(),
      description: description.trim(),
      popularProducts,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    setSaved(true)
    setErrors({})
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-up">
      {/* Page Header */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 28,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: "#0f172a",
          }}
        >
          About Your Business
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 14, color: "#475569", marginTop: 4 }}>
          Tell us about your business — this helps personalize insights, outreach, and briefings.
        </p>
      </div>

      {/* Location */}
      <div className="glass-card p-5" style={{ borderRadius: 16 }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(8,145,178,0.1)" }}
          >
            <MapPin className="w-4.5 h-4.5 text-[#0891b2]" />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                color: "#0f172a",
              }}
            >
              Location
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#94a3b8" }}>
              Where is your business located?
            </p>
          </div>
        </div>
        <input
          type="text"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value)
            setErrors((prev) => ({ ...prev, location: false }))
          }}
          placeholder="e.g. 123 Main St, Hayward, CA 94541"
          className={cn(
            "w-full px-4 py-3 rounded-xl glass-inset text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 transition-shadow",
            errors.location ? "focus:ring-[#ef4444]/40 ring-2 ring-[#ef4444]/40" : "focus:ring-[#0891b2]/40"
          )}
          style={{ fontFamily: "var(--font-body)", borderRadius: 12 }}
        />
        {errors.location && (
          <p className="flex items-center gap-1 mt-2 text-xs text-[#ef4444]" style={{ fontFamily: "var(--font-body)" }}>
            <AlertCircle className="w-3 h-3" /> Location is required
          </p>
        )}
      </div>

      {/* Description */}
      <div className="glass-card p-5" style={{ borderRadius: 16 }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <FileText className="w-4.5 h-4.5 text-[#6366f1]" />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                color: "#0f172a",
              }}
            >
              Description
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#94a3b8" }}>
              How do you want your business to be perceived?
            </p>
          </div>
        </div>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setErrors((prev) => ({ ...prev, description: false }))
          }}
          placeholder="e.g. A cozy neighborhood coffee shop focused on ethically sourced beans, community events, and a welcoming atmosphere for everyone."
          rows={4}
          className={cn(
            "w-full px-4 py-3 rounded-xl glass-inset text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 transition-shadow resize-none",
            errors.description ? "focus:ring-[#ef4444]/40 ring-2 ring-[#ef4444]/40" : "focus:ring-[#0891b2]/40"
          )}
          style={{ fontFamily: "var(--font-body)", borderRadius: 12, lineHeight: 1.6 }}
        />
        {errors.description && (
          <p className="flex items-center gap-1 mt-2 text-xs text-[#ef4444]" style={{ fontFamily: "var(--font-body)" }}>
            <AlertCircle className="w-3 h-3" /> Description is required
          </p>
        )}
      </div>

      {/* Popular Products */}
      <div className="glass-card p-5" style={{ borderRadius: 16 }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.1)" }}
          >
            <ShoppingBag className="w-4.5 h-4.5 text-[#10b981]" />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 16,
                color: "#0f172a",
              }}
            >
              Popular Products
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#94a3b8" }}>
              What are your most appealing items or services?
            </p>
          </div>
        </div>

        {/* Product Tags */}
        {popularProducts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {popularProducts.map((product) => (
              <span
                key={product}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all"
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                  background: "rgba(16,185,129,0.1)",
                  color: "#059669",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                {product}
                <button
                  onClick={() => removeProduct(product)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[rgba(239,68,68,0.15)] transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add Product Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newProduct}
            onChange={(e) => setNewProduct(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addProduct()
              }
            }}
            placeholder="e.g. Oat Milk Latte"
            className={cn(
              "flex-1 px-4 py-3 rounded-xl glass-inset text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 transition-shadow",
              errors.products ? "focus:ring-[#ef4444]/40 ring-2 ring-[#ef4444]/40" : "focus:ring-[#0891b2]/40"
            )}
            style={{ fontFamily: "var(--font-body)", borderRadius: 12 }}
          />
          <button
            onClick={addProduct}
            className="px-4 py-3 rounded-xl flex items-center justify-center gap-1.5 text-white transition-all hover:opacity-90 press-scale"
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 14,
              borderRadius: 12,
              background: "#0891b2",
              boxShadow: "0 4px 12px rgba(8,145,178,0.2)",
            }}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        {errors.products && (
          <p className="flex items-center gap-1 mt-2 text-xs text-[#ef4444]" style={{ fontFamily: "var(--font-body)" }}>
            <AlertCircle className="w-3 h-3" /> Add at least one product
          </p>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full py-4 rounded-xl flex items-center justify-center gap-2 transition-all press-scale"
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          fontSize: 16,
          borderRadius: 14,
          background: saved ? "#10b981" : "#0891b2",
          color: "#fff",
          boxShadow: saved ? "0 4px 16px rgba(16,185,129,0.25)" : "0 4px 16px rgba(8,145,178,0.25)",
        }}
      >
        {saved ? (
          <>
            <CheckCircle2 className="w-5 h-5" /> Saved!
          </>
        ) : (
          <>
            <Save className="w-5 h-5" /> Save Business Info
          </>
        )}
      </button>
    </div>
  )
}
