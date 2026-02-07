"use client"

import React from "react"

import { useStore } from "@/lib/store"
import type { MainTab } from "@/lib/types"
import { useTheme } from "next-themes"
import {
  Receipt, Scale, Users, Shield, BarChart3, Bot, UserCircle,
  Sun, Moon, Copy, Check, CalendarDays, ChevronDown, Plus,
} from "lucide-react"
import { useState } from "react"
import { TransactionsTab } from "./tabs/transactions-tab"
import { CalendarTab } from "./tabs/calendar-tab"
import { DebtsTab } from "./tabs/debts-tab"
import { PeopleTab } from "./tabs/people-tab"
import { PermissionsTab } from "./tabs/permissions-tab"
import { HighlightsTab } from "./tabs/highlights-tab"
import { AITab } from "./tabs/ai-tab"
import { AccountTab } from "./tabs/account-tab"

const TABS: { id: MainTab; label: string; icon: React.ElementType }[] = [
  { id: "transactions", label: "Txns", icon: Receipt },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "debts", label: "Debts", icon: Scale },
  { id: "people", label: "People", icon: Users },
  { id: "permissions", label: "Perms", icon: Shield },
  { id: "highlights", label: "Stats", icon: BarChart3 },
  { id: "ai", label: "AI", icon: Bot },
  { id: "account", label: "Account", icon: UserCircle },
]

function TopBar() {
  const { group, groups, activeGroupId, switchGroup, goToNewGroup } = useStore()
  const { theme, setTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [showGroupPicker, setShowGroupPicker] = useState(false)

  const handleCopy = async () => {
    if (!group) return
    await navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="sticky top-0 z-50 safe-top">
      <div className="glass-card mx-4 mt-3 px-4 py-3 flex items-center justify-between">
        {/* Group name - clickable to switch */}
        <div className="relative">
          <button
            onClick={() => setShowGroupPicker(!showGroupPicker)}
            className="flex items-center gap-1.5 hover:bg-secondary/30 -ml-1 px-1 py-0.5 rounded-lg transition-colors"
          >
            <div className="flex flex-col text-left">
              <h1 className="text-base font-semibold text-foreground leading-tight">{group?.name}</h1>
              <span className="text-xs text-muted-foreground">{group?.currency} &middot; {group?.members.length} members</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showGroupPicker ? "rotate-180" : ""}`} />
          </button>

          {/* Group picker dropdown */}
          {showGroupPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowGroupPicker(false)} />
              <div className="absolute top-full left-0 mt-2 z-50 w-64 glass-card border border-border/50 rounded-xl p-2 shadow-xl">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1.5">Your groups</p>
                <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        switchGroup(g.id)
                        setShowGroupPicker(false)
                      }}
                      className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-left transition-all ${
                        g.id === activeGroupId
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        g.id === activeGroupId
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{g.name}</p>
                        <p className="text-[11px] text-muted-foreground">{g.members.length} members &middot; {g.currency}</p>
                      </div>
                      {g.id === activeGroupId && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border/50 mt-1.5 pt-1.5">
                  <button
                    onClick={() => {
                      setShowGroupPicker(false)
                      goToNewGroup()
                    }}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg text-left w-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                  >
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-secondary border border-dashed border-border/50">
                      <Plus className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">Create or join group</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Copy invite code"
          >
            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
            <span>{group?.inviteCode}</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}

function BottomNav() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom bg-card/80 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-center overflow-x-auto scrollbar-hide px-1 py-1.5 max-w-lg mx-auto">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-[44px] transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function TabContent() {
  const { activeTab } = useStore()

  switch (activeTab) {
    case "transactions": return <TransactionsTab />
    case "calendar": return <CalendarTab />
    case "debts": return <DebtsTab />
    case "people": return <PeopleTab />
    case "permissions": return <PermissionsTab />
    case "highlights": return <HighlightsTab />
    case "ai": return <AITab />
    case "account": return <AccountTab />
    default: return null
  }
}

export function MainShell() {
  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <TopBar />
      <main className="flex-1 px-4 py-4">
        <TabContent />
      </main>
      <BottomNav />
    </div>
  )
}
