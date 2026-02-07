"use client"

import React from "react"

import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import {
  LogOut, Sun, Moon, Smartphone, Bell, Globe,
  ChevronRight, Shield, Info, ExternalLink, Plus, Check, ArrowRightLeft,
} from "lucide-react"

function MemberAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  return (
    <div
      className="h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-xl text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

function SettingRow({ icon: Icon, label, value, onClick }: {
  icon: React.ElementType
  label: string
  value?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 py-3.5 w-full text-left hover:bg-secondary/30 -mx-1 px-1 rounded-lg transition-colors"
      disabled={!onClick}
    >
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
    </button>
  )
}

export function AccountTab() {
  const { user, group, groups, activeGroupId, switchGroup, goToNewGroup, logout, formatAmount, currentMemberId } = useStore()
  const { theme, setTheme } = useTheme()

  const currentMember = group?.members.find(m => m.id === currentMemberId)
  const myTotalPaid = group?.transactions
    .filter(tx => tx.paidByMemberId === currentMemberId)
    .reduce((s, tx) => s + tx.amount, 0) || 0
  const txCount = group?.transactions
    .filter(tx => tx.paidByMemberId === currentMemberId).length || 0

  const handleInstallPWA = () => {
    // @ts-expect-error - PWA beforeinstallprompt event
    if (window.deferredPrompt) {
      // @ts-expect-error - PWA beforeinstallprompt event
      window.deferredPrompt.prompt()
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-foreground">Account</h2>

      {/* Profile card */}
      <div className="glass-card p-5 flex items-center gap-4">
        {currentMember && (
          <MemberAvatar name={currentMember.name} color={currentMember.avatarColor} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{user?.name || currentMember?.name}</p>
          <p className="text-sm text-muted-foreground truncate">{user?.email || currentMember?.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground">
              Paid: <span className="text-foreground font-medium">{formatAmount(myTotalPaid)}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Txns: <span className="text-foreground font-medium">{txCount}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="glass-card p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">Your groups ({groups.length})</p>
          <button
            onClick={goToNewGroup}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3 w-3" /> New group
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => switchGroup(g.id)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                g.id === activeGroupId
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "bg-secondary/30 hover:bg-secondary/50"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                g.id === activeGroupId
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {g.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${g.id === activeGroupId ? "text-primary" : "text-foreground"}`}>
                  {g.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {g.members.length} members &middot; {g.currency} &middot; {g.transactions.length} txns
                </p>
              </div>
              {g.id === activeGroupId ? (
                <Check className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="glass-card p-4 flex flex-col">
        <p className="text-xs text-muted-foreground mb-2">Settings</p>
        <SettingRow
          icon={theme === "dark" ? Moon : Sun}
          label="Theme"
          value={theme === "dark" ? "Dark" : "Light"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
        <SettingRow
          icon={Bell}
          label="Notifications"
          value="Coming soon"
        />
        <SettingRow
          icon={Globe}
          label="Language"
          value="English"
        />
        <SettingRow
          icon={Smartphone}
          label="Install App"
          value="PWA"
          onClick={handleInstallPWA}
        />
      </div>

      {/* About */}
      <div className="glass-card p-4 flex flex-col">
        <p className="text-xs text-muted-foreground mb-2">About</p>
        <SettingRow
          icon={Info}
          label="Version"
          value="1.0.0"
        />
        <SettingRow
          icon={Shield}
          label="Privacy Policy"
          onClick={() => {}}
        />
        <SettingRow
          icon={ExternalLink}
          label="Terms of Service"
          onClick={() => {}}
        />
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        onClick={logout}
        className="h-12 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-2 bg-transparent"
      >
        <LogOut className="h-5 w-5" /> Log out
      </Button>

      <p className="text-center text-xs text-muted-foreground pb-4">
        Roomies Ledger - Built for roommates, by roommates
      </p>
    </div>
  )
}
