"use client"

import React from "react"

import { useStore } from "@/lib/store"
import { getTotalSpent, getSpendingByPeriod, getTopSpender, getSpendingOverTime, exportTransactionsCSV, exportBalancesCSV } from "@/lib/finance"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, TrendingDown, Download, Calendar, DollarSign, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent?: string }) {
  return (
    <div className="glass-card p-4 flex items-start gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${accent || "bg-primary/10 text-primary"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}

export function HighlightsTab() {
  const { group, formatAmount, getNetBalances } = useStore()

  if (!group) return null

  const memberIds = group.members.map(m => m.id)
  const totalSpent = getTotalSpent(group.transactions)
  const weeklySpending = getSpendingByPeriod(group.transactions, "week")
  const monthlySpending = getSpendingByPeriod(group.transactions, "month")
  const topSpender = getTopSpender(group.transactions, memberIds)
  const topSpenderName = topSpender ? group.members.find(m => m.id === topSpender.memberId)?.name || "?" : "N/A"
  const spendingOverTime = getSpendingOverTime(group.transactions)
  const balances = getNetBalances()

  // Spending by member for pie chart
  const spendingByMember = group.members.map(m => {
    const total = group.transactions
      .filter(tx => tx.paidByMemberId === m.id)
      .reduce((sum, tx) => sum + tx.amount, 0)
    return { name: m.name, value: total / 100, color: m.avatarColor }
  }).filter(d => d.value > 0)

  // Chart data for area chart
  const areaData = spendingOverTime.map(d => ({
    date: d.date.slice(5), // MM-DD
    amount: d.amount / 100,
  }))

  // Balance data for bar chart
  const balanceData = balances.map(b => {
    const member = group.members.find(m => m.id === b.memberId)
    return {
      name: member?.name || "?",
      balance: b.balance / 100,
      fill: b.balance >= 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)",
    }
  })

  const handleExportTransactions = () => {
    const csv = exportTransactionsCSV(group.transactions, group.members)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${group.name.replace(/\s+/g, "-")}-transactions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportBalances = () => {
    const csv = exportBalancesCSV(balances, group.members)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${group.name.replace(/\s+/g, "-")}-balances.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-foreground">Highlights</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total spent" value={formatAmount(totalSpent)} icon={DollarSign} />
        <StatCard label="This week" value={formatAmount(weeklySpending)} icon={Calendar} accent="bg-chart-2/10 text-chart-2" />
        <StatCard label="This month" value={formatAmount(monthlySpending)} icon={TrendingUp} accent="bg-chart-3/10 text-chart-3" />
        <StatCard label="Top spender" value={topSpenderName} icon={Crown} accent="bg-chart-4/10 text-chart-4" />
      </div>

      {/* Spending over time chart */}
      {areaData.length > 1 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Spending over time</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={v => `$${v}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(160, 84%, 39%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSpend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Spending breakdown - pie chart */}
      {spendingByMember.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Who paid what</h3>
          <div className="flex items-center gap-4">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingByMember}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {spendingByMember.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Paid"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {spendingByMember.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-foreground flex-1 truncate">{d.name}</span>
                  <span className="text-xs font-medium text-muted-foreground">${d.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Net balances bar chart */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Net balances</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={balanceData} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={v => `$${Math.abs(v)}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`$${Math.abs(value).toFixed(2)}`, value >= 0 ? "Owed" : "Owes"]}
              />
              <Bar dataKey="balance" radius={[6, 6, 0, 0]} barSize={32}>
                {balanceData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Export data</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTransactions}
            className="flex-1 h-10 rounded-xl border-border/50 flex items-center gap-2 text-sm bg-transparent"
          >
            <Download className="h-4 w-4" /> Transactions CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBalances}
            className="flex-1 h-10 rounded-xl border-border/50 flex items-center gap-2 text-sm bg-transparent"
          >
            <Download className="h-4 w-4" /> Balances CSV
          </Button>
        </div>
      </div>
    </div>
  )
}
