"use client"

import { useStore } from "@/lib/store"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { ArrowRight, CreditCard, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

function MemberAvatar({ name, color, size = "sm" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const s = size === "sm" ? "h-7 w-7 text-[10px]" : size === "md" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm"
  return (
    <div
      className={`${s} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

export function DebtsTab() {
  const { group, getNetBalances, getSettlements, formatAmount } = useStore()
  const balances = getNetBalances()
  const settlements = getSettlements()

  const chartData = balances.map(b => {
    const member = group?.members.find(m => m.id === b.memberId)
    return {
      name: member?.name || "?",
      balance: b.balance / 100,
      fill: b.balance >= 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)",
    }
  })

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-foreground">Debts</h2>

      {/* Net Balances */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Net balances</h3>
        <div className="flex flex-col gap-2">
          {balances.map(b => {
            const member = group?.members.find(m => m.id === b.memberId)
            if (!member) return null
            const isPositive = b.balance >= 0
            return (
              <div key={b.memberId} className="glass-card p-3.5 flex items-center gap-3">
                <MemberAvatar name={member.name} color={member.avatarColor} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isPositive ? "is owed" : "owes"}
                  </p>
                </div>
                <span className={`text-base font-bold ${isPositive ? "text-primary" : "text-destructive"}`}>
                  {isPositive ? "+ " : "- "}{formatAmount(Math.abs(b.balance))}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Balance overview</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={v => `$${Math.abs(v)}`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                width={50}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine x={0} stroke="hsl(var(--border))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`$${Math.abs(value).toFixed(2)}`, value >= 0 ? "Owed" : "Owes"]}
              />
              <Bar dataKey="balance" radius={[0, 6, 6, 0]} barSize={20}>
                {chartData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Settlements */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Suggested settlements</h3>
        {settlements.length === 0 ? (
          <div className="glass-card p-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-primary/50" />
            <p className="text-sm text-muted-foreground">All settled up!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {settlements.map((s, i) => {
              const from = group?.members.find(m => m.id === s.fromMemberId)
              const to = group?.members.find(m => m.id === s.toMemberId)
              if (!from || !to) return null
              return (
                <div key={i} className="glass-card p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <MemberAvatar name={from.name} color={from.avatarColor} size="md" />
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-xs text-muted-foreground">pays</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="text-base font-bold text-foreground">{formatAmount(s.amount)}</span>
                    </div>
                    <MemberAvatar name={to.name} color={to.avatarColor} size="md" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    {from.name} pays {to.name} {formatAmount(s.amount)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 rounded-xl border-border/50 text-xs flex items-center gap-1.5 bg-transparent"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Pay with Apple Pay
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 rounded-xl border-border/50 text-xs bg-transparent"
                    >
                      Mark as settled
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
