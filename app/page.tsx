"use client"

import { useStore } from "@/lib/store"
import { AuthScreen } from "@/components/auth-screen"
import { GroupGate } from "@/components/group-gate"
import { MainShell } from "@/components/main-shell"
import { Loader2 } from "lucide-react"

export default function Page() {
  const { appScreen, groups, loadingData } = useStore()

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (appScreen === "auth") return <AuthScreen />
  if (appScreen === "group-gate") return <GroupGate />
  if (groups.length === 0) return <GroupGate />
  return <MainShell />
}
