"use client"

import React from "react"
import { useState, useRef } from "react"
import { useStore } from "@/lib/store"
import type { Transaction } from "@/lib/types"
import { CURRENCIES, getCurrencySymbolByCode } from "@/lib/types"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Plus, X, Camera, Upload, Calendar, ChevronRight,
  Receipt, ImageIcon, Trash2, MapPin, ArrowRight, ArrowLeft,
  Repeat, RefreshCw, ArrowLeftRight, Loader2, ChevronDown as ChevronDownIcon
} from "lucide-react"
import { format } from "date-fns"

function MemberAvatar({ name, color, size = "sm" }: { name: string; color: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const s = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"
  return (
    <div
      className={`${s} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

function TransactionCard({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const { group, formatAmount } = useStore()
  const payer = group?.members.find(m => m.id === tx.paidByMemberId)

  return (
    <button
      onClick={onClick}
      className="glass-card p-4 w-full text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate text-[15px]">{tx.title}</p>
        {tx.place && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" /> {tx.place}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {payer && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/80 text-xs text-muted-foreground">
              <MemberAvatar name={payer.name} color={payer.avatarColor} size="sm" />
              <span className="max-w-[80px] truncate">Paid by {payer.name}</span>
            </span>
          )}
          <span className="text-xs text-muted-foreground">{format(new Date(tx.date), "MMM d")}</span>
          {tx.isRecurring && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-chart-2/15 text-chart-2 font-medium inline-flex items-center gap-0.5">
              <Repeat className="h-2.5 w-2.5" /> {tx.recurrence?.frequency}
            </span>
          )}
          {tx.splitType !== "equal" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {tx.splitType === "exact" ? "Custom" : "%"}
            </span>
          )}
        </div>
      </div>
  <div className="flex items-center gap-2 shrink-0">
    <div className="flex flex-col items-end">
      <span className="text-base font-semibold text-foreground">{formatAmount(tx.amount)}</span>
      {tx.originalCurrency && tx.originalAmount && (
        <span className="text-[10px] text-muted-foreground leading-tight">
          {getCurrencySymbolByCode(tx.originalCurrency)}{(tx.originalAmount / 100).toFixed(2)} {tx.originalCurrency}
        </span>
      )}
    </div>
  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      </div>
    </button>
  )
}

function TransactionDetail({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { group, formatAmount, addReceipt, deleteTransaction, currentMemberId } = useStore()
  const payer = group?.members.find(m => m.id === tx.paidByMemberId)
  const splitMembers = group?.members.filter(m => tx.splitBetweenMemberIds.includes(m.id)) || []
  const canDelete = group?.permissions[currentMemberId]?.canDeleteTransactions
  const fileRef = useRef<HTMLInputElement>(null)

  const getMemberShare = (memberId: string) => {
    if (tx.splitType === "exact" && tx.splitAmounts) {
      return tx.splitAmounts[memberId] || 0
    }
    if (tx.splitType === "percentage" && tx.splitPercentages) {
      return Math.round((tx.amount * (tx.splitPercentages[memberId] || 0)) / 100)
    }
    return Math.floor(tx.amount / tx.splitBetweenMemberIds.length)
  }

  const splitLabel = tx.splitType === "exact" ? "Custom amounts" : tx.splitType === "percentage" ? "By percentage" : "Equal split"

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      addReceipt(tx.id, url)
    }
  }

  return (
    <DialogContent className="max-w-sm mx-auto glass-card border-border/50 p-0 gap-0">
      <DialogHeader className="p-5 pb-0">
        <DialogTitle className="text-lg font-semibold text-foreground">{tx.title}</DialogTitle>
      </DialogHeader>
      <div className="p-5 flex flex-col gap-5">
  <div className="flex items-center justify-between">
    <div className="flex flex-col">
      <span className="text-3xl font-bold text-foreground">{formatAmount(tx.amount)}</span>
      {tx.originalCurrency && tx.originalAmount && tx.exchangeRate && (
        <div className="flex items-center gap-1.5 mt-1">
          <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {getCurrencySymbolByCode(tx.originalCurrency)}{(tx.originalAmount / 100).toFixed(2)} {tx.originalCurrency}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            (1 {tx.originalCurrency} = {tx.exchangeRate.toFixed(4)} {tx.currency})
          </span>
        </div>
      )}
    </div>
  <div className="flex flex-col items-end gap-0.5">
  <span className="text-sm text-muted-foreground">{format(new Date(tx.date), "MMMM d, yyyy")}</span>
  {tx.place && (
  <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
  <MapPin className="h-3 w-3" /> {tx.place}
  </span>
  )}
  </div>
        </div>

        {tx.isRecurring && tx.recurrence && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-chart-2/10 text-chart-2">
            <Repeat className="h-4 w-4" />
            <span className="text-sm font-medium capitalize">Recurring {tx.recurrence.frequency}</span>
          </div>
        )}

        {payer && (
          <div className="flex items-center gap-2">
            <MemberAvatar name={payer.name} color={payer.avatarColor} size="md" />
            <div>
              <p className="text-sm font-medium text-foreground">Paid by {payer.name}</p>
              <p className="text-xs text-muted-foreground">Full amount</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Split between</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{splitLabel}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {splitMembers.map(m => {
              const shareAmount = getMemberShare(m.id)
              return (
                <div key={m.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <MemberAvatar name={m.name} color={m.avatarColor} />
                    <span className="text-sm text-foreground">{m.name}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatAmount(shareAmount)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Receipt section */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Receipt</p>
          {tx.receipt ? (
            <div className="glass-card p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Receipt attached</span>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-xs text-muted-foreground">OCR Detected Total</p>
                <p className="text-lg font-bold text-foreground mt-1">{formatAmount(tx.amount)}</p>
                <Button variant="outline" size="sm" className="mt-2 h-8 text-xs rounded-lg border-border/50 bg-transparent">
                  Use detected amount
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleReceiptUpload} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="flex-1 h-10 rounded-xl border-border/50 flex items-center gap-2 text-sm"
              >
                <Upload className="h-4 w-4" /> Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="flex-1 h-10 rounded-xl border-border/50 flex items-center gap-2 text-sm"
              >
                <Camera className="h-4 w-4" /> Camera
              </Button>
            </div>
          )}
        </div>

        {canDelete && (
          <Button
            variant="outline"
            onClick={() => { deleteTransaction(tx.id); onClose() }}
            className="h-10 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" /> Delete transaction
          </Button>
        )}
      </div>
    </DialogContent>
  )
}

type SplitMode = "equal" | "exact" | "percentage"

function AddTransactionSheet({ onClose }: { onClose: () => void }) {
  const { group, addTransaction, formatAmount, getCurrencySymbol } = useStore()

  // Step management (3 steps now)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 fields: Details
  const [title, setTitle] = useState("")
  const [place, setPlace] = useState("")
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [payerId, setPayerId] = useState(group?.members[0]?.id || "")

  // Step 2 fields: Amount & Options
  const [amountStr, setAmountStr] = useState("")
  const [paymentCurrency, setPaymentCurrency] = useState(group?.currency || "USD")
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [currencySearch, setCurrencySearch] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly" | "yearly">("monthly")

  // Exchange rate (only fetched when payment currency differs from group currency)
  const groupCurrency = group?.currency || "USD"
  const isDifferentCurrency = paymentCurrency !== groupCurrency
  const { rate: exchangeRate, isLoading: rateLoading, error: rateError } = useExchangeRate(
    isDifferentCurrency ? paymentCurrency : null,
    isDifferentCurrency ? groupCurrency : null,
  )

  // Step 3 fields: Split
  const [splitMode, setSplitMode] = useState<SplitMode>("equal")
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>(group?.members.map(m => m.id) || [])
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({})
  const [percentages, setPercentages] = useState<Record<string, string>>({})
  const [error, setError] = useState("")

  const rawAmountCents = Math.round(Number.parseFloat(amountStr || "0") * 100)
  // Converted amount in group's default currency
  const amountCents = isDifferentCurrency && exchangeRate
    ? Math.round(rawAmountCents * exchangeRate)
    : rawAmountCents
  const currSym = getCurrencySymbol()
  const payCurrSym = getCurrencySymbolByCode(paymentCurrency)

  const isStep1Valid = !!title.trim() && !!payerId
  const isStep2Valid = rawAmountCents > 0 && (!isDifferentCurrency || (exchangeRate !== null && !rateLoading))

  const toggleSplitMember = (id: string) => {
    setSplitMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  // Calculate totals for step 3 validation
  const exactTotal = splitMemberIds.reduce((sum, id) => {
    return sum + Math.round(Number.parseFloat(exactAmounts[id] || "0") * 100)
  }, 0)

  const percentTotal = splitMemberIds.reduce((sum, id) => {
    return sum + Number.parseFloat(percentages[id] || "0")
  }, 0)

  const isStep3Valid = (() => {
    if (splitMemberIds.length === 0) return false
    if (splitMode === "equal") return true
    if (splitMode === "exact") return exactTotal === amountCents
    if (splitMode === "percentage") return Math.abs(percentTotal - 100) < 0.01
    return false
  })()

  const goToStep2 = () => {
    if (!isStep1Valid) return
    setStep(2)
  }

  const goToStep3 = () => {
    if (!isStep2Valid) return
    // Pre-fill equal values for exact/percentage when entering step 3
    const members = group?.members || []
    const ids = members.map(m => m.id)
    if (Object.keys(exactAmounts).length === 0) {
      const perPerson = (amountCents / ids.length / 100).toFixed(2)
      const map: Record<string, string> = {}
      ids.forEach(id => { map[id] = perPerson })
      setExactAmounts(map)
    }
    if (Object.keys(percentages).length === 0) {
      const perPerson = (100 / ids.length).toFixed(1)
      const map: Record<string, string> = {}
      ids.forEach(id => { map[id] = perPerson })
      setPercentages(map)
    }
    setStep(3)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStep3Valid) {
      if (splitMode === "exact") setError(`Amounts must add up to ${formatAmount(amountCents)}`)
      else if (splitMode === "percentage") setError("Percentages must add up to 100%")
      else setError("Select at least one member")
      return
    }

    const tx: Omit<Transaction, "id" | "createdAt" | "currency"> = {
      title: title.trim(),
      amount: amountCents,
      date: new Date(date).toISOString(),
      place: place.trim() || undefined,
      paidByMemberId: payerId,
      splitBetweenMemberIds: splitMemberIds,
      splitType: splitMode,
      isRecurring,
      recurrence: isRecurring ? { frequency } : undefined,
      // Store original currency info if payment was in a different currency
      ...(isDifferentCurrency && exchangeRate ? {
        originalCurrency: paymentCurrency,
        originalAmount: rawAmountCents,
        exchangeRate,
      } : {}),
    }

    if (splitMode === "exact") {
      const amounts: Record<string, number> = {}
      splitMemberIds.forEach(id => {
        amounts[id] = Math.round(Number.parseFloat(exactAmounts[id] || "0") * 100)
      })
      tx.splitAmounts = amounts
    }

    if (splitMode === "percentage") {
      const pcts: Record<string, number> = {}
      splitMemberIds.forEach(id => {
        pcts[id] = Number.parseFloat(percentages[id] || "0")
      })
      tx.splitPercentages = pcts
    }

    if (receiptFile) {
      const url = URL.createObjectURL(receiptFile)
      ;(tx as Transaction).receipt = { imageUrl: url, uploadedAt: new Date().toISOString() }
    }

    addTransaction(tx)
    onClose()
  }

  const equalShare = splitMemberIds.length > 0 ? Math.floor(amountCents / splitMemberIds.length) : 0

  const stepTitles = ["Details", "Amount", "Split"]

  return (
    <DialogContent className="max-w-sm mx-auto glass-card border-border/50 p-0 gap-0 max-h-[90vh] overflow-y-auto">
      <DialogHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {stepTitles[step - 1]}
          </DialogTitle>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-4 h-0.5 transition-colors ${step > s ? "bg-primary" : "bg-secondary"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogHeader>

      {/* STEP 1 - Details */}
      {step === 1 && (
        <div className="p-5 pt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Title *</Label>
            <Input
              placeholder="What was the expense?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-12 rounded-xl bg-secondary/50 border-border/50 text-foreground"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Place <span className="text-muted-foreground/50">(optional)</span>
            </Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. Trader Joe's, Amazon"
                value={place}
                onChange={e => setPlace(e.target.value)}
                className="h-12 rounded-xl bg-secondary/50 border-border/50 pl-10 text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="h-12 rounded-xl bg-secondary/50 border-border/50 pl-10 text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Paid by *</Label>
            <div className="flex flex-wrap gap-2">
              {group?.members.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPayerId(m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    payerId === m.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MemberAvatar name={m.name} color={m.avatarColor} />
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            disabled={!isStep1Valid}
            onClick={goToStep2}
            className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* STEP 2 - Amount & Options */}
      {step === 2 && (
        <div className="p-5 pt-2 flex flex-col gap-4">
          {/* Mini summary */}
          <div className="glass-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(date), "MMM d, yyyy")}
                {place && ` \u00B7 ${place}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-primary font-medium shrink-0"
            >
              Edit
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Amount *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  {payCurrSym}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  className="h-14 rounded-xl bg-secondary/50 border-border/50 pl-10 text-2xl font-bold text-foreground"
                  autoFocus
                />
              </div>
              {/* Currency selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setShowCurrencyPicker(!showCurrencyPicker); setCurrencySearch("") }}
                  className="h-14 px-3 rounded-xl bg-secondary/50 border border-border/50 flex items-center gap-1.5 text-sm font-semibold text-foreground hover:bg-secondary/70 transition-colors"
                >
                  <span>{paymentCurrency}</span>
                  <ChevronDownIcon className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showCurrencyPicker ? "rotate-180" : ""}`} />
                </button>
                {showCurrencyPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyPicker(false)} />
                    <div className="absolute top-full right-0 mt-1 z-50 w-56 glass-card border border-border/50 rounded-xl p-2 shadow-xl">
                      <Input
                        placeholder="Search currency..."
                        value={currencySearch}
                        onChange={e => setCurrencySearch(e.target.value)}
                        className="h-8 rounded-lg bg-secondary/50 border-border/50 text-xs mb-1.5"
                        autoFocus
                      />
                      <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                        {CURRENCIES
                          .filter(c =>
                            c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                            c.name.toLowerCase().includes(currencySearch.toLowerCase())
                          )
                          .map(c => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setPaymentCurrency(c.code)
                                setShowCurrencyPicker(false)
                              }}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-all ${
                                paymentCurrency === c.code
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-secondary/50"
                              }`}
                            >
                              <span className="font-bold w-6">{c.symbol}</span>
                              <span className="font-medium">{c.code}</span>
                              <span className="text-muted-foreground truncate">{c.name}</span>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Conversion preview */}
            {isDifferentCurrency && rawAmountCents > 0 && (
              <div className="glass-card p-3 flex items-center gap-3">
                <ArrowLeftRight className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1">
                  {rateLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Fetching exchange rate...</span>
                    </div>
                  ) : rateError ? (
                    <p className="text-xs text-destructive">{rateError}</p>
                  ) : exchangeRate ? (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        {formatAmount(amountCents)} <span className="text-xs font-normal text-muted-foreground">{groupCurrency}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        1 {paymentCurrency} = {exchangeRate.toFixed(4)} {groupCurrency}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Recurring toggle */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Recurring</Label>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isRecurring
                  ? "bg-chart-2/10 text-chart-2 ring-1 ring-chart-2/30"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isRecurring ? "text-chart-2" : ""}`} />
              <span className="flex-1 text-left">{isRecurring ? "Recurring payment" : "One-time payment"}</span>
              <div className={`h-5 w-9 rounded-full relative transition-colors ${isRecurring ? "bg-chart-2" : "bg-secondary"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-all ${isRecurring ? "left-[18px]" : "left-0.5"}`} />
              </div>
            </button>
            {isRecurring && (
              <div className="flex flex-wrap gap-2">
                {(["daily", "weekly", "biweekly", "monthly", "yearly"] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                      frequency === f
                        ? "bg-chart-2 text-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Receipt */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Receipt <span className="text-muted-foreground/50">(optional)</span>
            </Label>
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
            {receiptFile ? (
              <div className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground truncate max-w-[200px]">{receiptFile.name}</span>
                </div>
                <button type="button" onClick={() => setReceiptFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="h-10 rounded-xl border-border/50 flex items-center gap-2 text-sm border-dashed"
              >
                <Camera className="h-4 w-4" /> Add receipt
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="h-12 flex-1 rounded-xl border-border/50 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              type="button"
              disabled={!isStep2Valid}
              onClick={goToStep3}
              className="h-12 flex-[2] rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 - Split */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="p-5 pt-2 flex flex-col gap-4">
          {/* Summary bar */}
          <div className="glass-card p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Splitting</span>
              <span className="text-base font-bold text-foreground">{formatAmount(amountCents)}</span>
              {isDifferentCurrency && rawAmountCents > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {payCurrSym}{(rawAmountCents / 100).toFixed(2)} {paymentCurrency}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">{title}</span>
              {place && <span className="text-xs text-muted-foreground/70">{place}</span>}
            </div>
          </div>

          {/* Split type selector */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">How to split</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "equal" as SplitMode, label: "Equal", icon: "=" },
                { key: "exact" as SplitMode, label: "By amount", icon: currSym },
                { key: "percentage" as SplitMode, label: "By %", icon: "%" },
              ]).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { setSplitMode(opt.key); setError("") }}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                    splitMode === opt.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-lg font-bold">{opt.icon}</span>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Member selection */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Split between</Label>
            <div className="flex flex-wrap gap-2">
              {group?.members.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleSplitMember(m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    splitMemberIds.includes(m.id)
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MemberAvatar name={m.name} color={m.avatarColor} />
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Equal split preview */}
          {splitMode === "equal" && splitMemberIds.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="glass-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Each person owes</span>
                  <span className="text-sm font-bold text-primary">{formatAmount(equalShare)}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {splitMemberIds.map(id => {
                    const m = group?.members.find(mem => mem.id === id)
                    if (!m) return null
                    return (
                      <div key={id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <MemberAvatar name={m.name} color={m.avatarColor} />
                          <span className="text-sm text-foreground">{m.name}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{formatAmount(equalShare)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Exact amount inputs */}
          {splitMode === "exact" && splitMemberIds.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Enter amount for each person</span>
                <span className={`text-xs font-medium ${exactTotal === amountCents ? "text-primary" : "text-destructive"}`}>
                  {formatAmount(exactTotal)} / {formatAmount(amountCents)}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {splitMemberIds.map(id => {
                  const m = group?.members.find(mem => mem.id === id)
                  if (!m) return null
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <MemberAvatar name={m.name} color={m.avatarColor} />
                        <span className="text-sm text-foreground truncate">{m.name}</span>
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {currSym}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={exactAmounts[id] || ""}
                          onChange={e => {
                            setExactAmounts(prev => ({ ...prev, [id]: e.target.value }))
                            setError("")
                          }}
                          className="h-10 rounded-xl bg-secondary/50 border-border/50 pl-8 text-sm font-medium text-foreground"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              {exactTotal !== amountCents && exactTotal > 0 && (
                <p className="text-xs text-destructive">
                  {exactTotal < amountCents
                    ? `${formatAmount(amountCents - exactTotal)} remaining to allocate`
                    : `${formatAmount(exactTotal - amountCents)} over the total`}
                </p>
              )}
            </div>
          )}

          {/* Percentage inputs */}
          {splitMode === "percentage" && splitMemberIds.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Enter % for each person</span>
                <span className={`text-xs font-medium ${Math.abs(percentTotal - 100) < 0.01 ? "text-primary" : "text-destructive"}`}>
                  {percentTotal.toFixed(1)}% / 100%
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {splitMemberIds.map(id => {
                  const m = group?.members.find(mem => mem.id === id)
                  if (!m) return null
                  const pctVal = Number.parseFloat(percentages[id] || "0")
                  const amtFromPct = Math.round((amountCents * pctVal) / 100)
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <MemberAvatar name={m.name} color={m.avatarColor} />
                        <span className="text-sm text-foreground truncate">{m.name}</span>
                      </div>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={percentages[id] || ""}
                          onChange={e => {
                            setPercentages(prev => ({ ...prev, [id]: e.target.value }))
                            setError("")
                          }}
                          className="h-10 rounded-xl bg-secondary/50 border-border/50 pr-8 text-sm font-medium text-foreground"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                        {formatAmount(amtFromPct)}
                      </span>
                    </div>
                  )
                })}
              </div>
              {Math.abs(percentTotal - 100) >= 0.01 && percentTotal > 0 && (
                <p className="text-xs text-destructive">
                  {percentTotal < 100
                    ? `${(100 - percentTotal).toFixed(1)}% remaining`
                    : `${(percentTotal - 100).toFixed(1)}% over 100%`}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setStep(2); setError("") }}
              className="h-12 flex-1 rounded-xl border-border/50 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              type="submit"
              disabled={!isStep3Valid}
              className="h-12 flex-[2] rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
            >
              Add expense
            </Button>
          </div>
        </form>
      )}
    </DialogContent>
  )
}

type TxFilter = "all" | "one-time" | "recurring"

export function TransactionsTab() {
  const { group, currentMemberId } = useStore()
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<TxFilter>("all")

  const canAdd = group?.permissions[currentMemberId]?.canAddTransactions !== false

  const allTransactions = group?.transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || []

  const transactions = allTransactions.filter(tx => {
    if (filter === "recurring") return tx.isRecurring
    if (filter === "one-time") return !tx.isRecurring
    return true
  })

  const recurringCount = allTransactions.filter(tx => tx.isRecurring).length
  const oneTimeCount = allTransactions.length - recurringCount

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Transactions</h2>
        <span className="text-xs text-muted-foreground">{transactions.length} total</span>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2">
        {([
          { key: "all" as TxFilter, label: "All", count: allTransactions.length },
          { key: "one-time" as TxFilter, label: "One-time", count: oneTimeCount },
          { key: "recurring" as TxFilter, label: "Recurring", count: recurringCount },
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

      <div className="flex flex-col gap-2.5">
        {transactions.map(tx => (
          <TransactionCard key={tx.id} tx={tx} onClick={() => setSelectedTx(tx)} />
        ))}
        {transactions.length === 0 && (
          <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground/70">Add your first expense to get started</p>
          </div>
        )}
      </div>

      {/* FAB */}
      {canAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed right-5 bottom-24 z-40 h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
      {!canAdd && (
        <div className="glass-card p-3 text-center text-xs text-muted-foreground">
          You do not have permission to add transactions
        </div>
      )}

      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        {selectedTx && <TransactionDetail tx={selectedTx} onClose={() => setSelectedTx(null)} />}
      </Dialog>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        {showAdd && <AddTransactionSheet onClose={() => setShowAdd(false)} />}
      </Dialog>
    </div>
  )
}
