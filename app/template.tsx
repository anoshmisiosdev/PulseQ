"use client"

import { ClientLayout } from "@/components/pulse/client-layout"

export default function Template({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>
}
