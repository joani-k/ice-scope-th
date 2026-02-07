"use client"

import { useStore } from "@/lib/store"
import { Switch } from "@/components/ui/switch"
import { Shield, Lock } from "lucide-react"

function MemberAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center font-semibold text-white text-xs shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

const PERM_LABELS: Record<string, { label: string; desc: string }> = {
  canAddTransactions: { label: "Add expenses", desc: "Can add new shared expenses" },
  canEditTransactions: { label: "Edit expenses", desc: "Can modify existing expenses" },
  canDeleteTransactions: { label: "Delete expenses", desc: "Can remove expenses" },
  canManageDebts: { label: "Manage debts", desc: "Can settle and manage debts" },
  isAdmin: { label: "Admin", desc: "Full admin access to group settings" },
}

export function PermissionsTab() {
  const { group, currentMemberId, updatePermission } = useStore()
  const isCurrentAdmin = group?.permissions[currentMemberId]?.isAdmin

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Permissions</h2>
      </div>

      {!isCurrentAdmin && (
        <div className="glass-card p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Only admins can change permissions. Contact your group admin.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {group?.members.map(member => {
          const perms = group.permissions[member.id]
          if (!perms) return null
          const isYou = member.id === currentMemberId
          return (
            <div key={member.id} className="glass-card p-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <MemberAvatar name={member.name} color={member.avatarColor} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    {isYou && (
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">You</span>
                    )}
                    {perms.isAdmin && (
                      <span className="px-1.5 py-0.5 rounded-md bg-warning/10 text-warning text-[10px] font-semibold">Admin</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 pl-12">
                {Object.entries(PERM_LABELS).map(([key, meta]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{meta.desc}</p>
                    </div>
                    <Switch
                      checked={perms[key as keyof typeof perms] as boolean}
                      onCheckedChange={(val) => updatePermission(member.id, key, val)}
                      disabled={!isCurrentAdmin || (isYou && key === "isAdmin")}
                      className="shrink-0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
