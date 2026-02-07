"use client"

import { useStore } from "@/lib/store"
import { Copy, Check, Share2, UserPlus, Mail } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

function MemberAvatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const s = size === "sm" ? "h-8 w-8 text-xs" : size === "md" ? "h-11 w-11 text-sm" : "h-14 w-14 text-base"
  return (
    <div
      className={`${s} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

function MemberCard({ member, isYou, totalPaid }: { member: { id: string; name: string; email?: string; avatarColor: string }; isYou: boolean; totalPaid: string }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <MemberAvatar name={member.name} color={member.avatarColor} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
          {isYou && (
            <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">You</span>
          )}
        </div>
        {member.email && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <Mail className="h-3 w-3 shrink-0" /> {member.email}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">Total paid</p>
        <p className="text-sm font-semibold text-foreground">{totalPaid}</p>
      </div>
    </div>
  )
}

export function PeopleTab() {
  const { group, currentMemberId, formatAmount } = useStore()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!group) return
    await navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (!group) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join our Roomies Ledger group",
          text: `Join "${group.name}" on Roomies Ledger! Use invite code: ${group.inviteCode}`,
        })
      } catch {
        // user cancelled share
      }
    } else {
      handleCopy()
    }
  }

  const getMemberTotalPaid = (memberId: string) => {
    if (!group) return 0
    return group.transactions
      .filter(tx => tx.paidByMemberId === memberId)
      .reduce((sum, tx) => sum + tx.amount, 0)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">People</h2>
        <span className="text-xs text-muted-foreground">{group?.members.length || 0} members</span>
      </div>

      {/* Invite section */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Invite roommates</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/50">
          <span className="flex-1 font-mono text-base font-semibold text-foreground tracking-[0.2em] text-center">
            {group?.inviteCode}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1 h-10 rounded-xl border-border/50 flex items-center gap-2 text-sm bg-transparent"
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy code"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 h-10 rounded-xl border-border/50 flex items-center gap-2 text-sm bg-transparent"
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      {/* Members list */}
      <div className="flex flex-col gap-2.5">
        {group?.members.map(member => (
          <MemberCard
            key={member.id}
            member={member}
            isYou={member.id === currentMemberId}
            totalPaid={formatAmount(getMemberTotalPaid(member.id))}
          />
        ))}
      </div>
    </div>
  )
}
