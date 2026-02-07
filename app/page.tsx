"use client"

import { useStore } from "@/lib/store"
import { AuthScreen } from "@/components/auth-screen"
import { GroupGate } from "@/components/group-gate"
import { MainShell } from "@/components/main-shell"

export default function Page() {
  const { appScreen, groups } = useStore()

  if (appScreen === "auth") return <AuthScreen />
  if (appScreen === "group-gate") return <GroupGate />
  // If somehow we're on "main" but have no groups, redirect to group-gate
  if (groups.length === 0) return <GroupGate />
  return <MainShell />
}
