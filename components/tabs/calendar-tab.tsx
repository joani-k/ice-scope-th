"use client"

import React, { useState, useMemo } from "react"
import { useStore } from "@/lib/store"
import type { Transaction } from "@/lib/types"
import {
  ChevronLeft,
  ChevronRight,
  Repeat,
  Receipt,
  MapPin,
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isToday } from "date-fns"

type CalFilter = "all" | "one-time" | "recurring"

function MemberAvatar({ name, color, size = "sm" }: { name: string; color: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const s = size === "sm" ? "h-5 w-5 text-[8px]" : "h-7 w-7 text-[10px]"
  return (
    <div
      className={`${s} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

export function CalendarTab() {
  const { group, formatAmount } = useStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [filter, setFilter] = useState<CalFilter>("all")

  const transactions = group?.transactions || []

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (filter === "recurring") return tx.isRecurring
      if (filter === "one-time") return !tx.isRecurring
      return true
    })
  }, [transactions, filter])

  // Map of date-key -> transactions for the current month
  const txByDate = useMemo(() => {
    const map: Record<string, Transaction[]> = {}
    filteredTransactions.forEach(tx => {
      const key = format(new Date(tx.date), "yyyy-MM-dd")
      if (!map[key]) map[key] = []
      map[key].push(tx)
    })
    return map
  }, [filteredTransactions])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart) // 0=Sun

  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null
  const selectedTxns = selectedDateKey ? (txByDate[selectedDateKey] || []) : []

  const recurringCount = transactions.filter(tx => tx.isRecurring).length
  const oneTimeCount = transactions.length - recurringCount

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Calendar</h2>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2">
        {([
          { key: "all" as CalFilter, label: "All", count: transactions.length },
          { key: "one-time" as CalFilter, label: "One-time", count: oneTimeCount },
          { key: "recurring" as CalFilter, label: "Recurring", count: recurringCount },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.key === "recurring" && <Repeat className="h-3 w-3" />}
            {f.label}
            <span className={`text-[10px] px-1 py-px rounded-full ${
              filter === f.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-base font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map(day => {
            const dayKey = format(day, "yyyy-MM-dd")
            const dayTxns = txByDate[dayKey] || []
            const hasTxns = dayTxns.length > 0
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const today = isToday(day)
            const hasRecurring = dayTxns.some(tx => tx.isRecurring)
            const hasOneTime = dayTxns.some(tx => !tx.isRecurring)

            return (
              <button
                key={dayKey}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all text-xs ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold"
                    : today
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-secondary/50"
                }`}
              >
                <span>{format(day, "d")}</span>
                {hasTxns && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {hasOneTime && (
                      <div className={`h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                    )}
                    {hasRecurring && (
                      <div className={`h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-chart-2"}`} />
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[10px] text-muted-foreground">One-time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-chart-2" />
            <span className="text-[10px] text-muted-foreground">Recurring</span>
          </div>
        </div>
      </div>

      {/* Selected date transactions */}
      {selectedDate && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {format(selectedDate, "EEEE, MMMM d")}
            </h3>
            <span className="text-xs text-muted-foreground">
              {selectedTxns.length} {selectedTxns.length === 1 ? "transaction" : "transactions"}
            </span>
          </div>

          {selectedTxns.length > 0 ? (
            <div className="flex flex-col gap-2">
              {selectedTxns
                .sort((a, b) => b.amount - a.amount)
                .map(tx => {
                  const payer = group?.members.find(m => m.id === tx.paidByMemberId)
                  return (
                    <div key={tx.id} className="glass-card p-3 flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.isRecurring ? "bg-chart-2/10" : "bg-primary/10"
                      }`}>
                        {tx.isRecurring ? (
                          <Repeat className="h-4 w-4 text-chart-2" />
                        ) : (
                          <Receipt className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{tx.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {payer && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MemberAvatar name={payer.name} color={payer.avatarColor} />
                              {payer.name}
                            </span>
                          )}
                          {tx.place && (
                            <span className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {tx.place}
                            </span>
                          )}
                          {tx.isRecurring && tx.recurrence && (
                            <span className="text-[10px] text-chart-2 capitalize">{tx.recurrence.frequency}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">
                        {formatAmount(tx.amount)}
                      </span>
                    </div>
                  )
                })}
              {/* Day total */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-muted-foreground">Day total</span>
                <span className="text-sm font-bold text-foreground">
                  {formatAmount(selectedTxns.reduce((s, tx) => s + tx.amount, 0))}
                </span>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 flex flex-col items-center gap-2 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No transactions on this date</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
