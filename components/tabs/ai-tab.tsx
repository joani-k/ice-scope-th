"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useStore } from "@/lib/store"
import { Bot, Send, User, Sparkles, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import type { UIMessage } from "ai"

const SUGGESTIONS = [
  "Who owes the most right now?",
  "What's our biggest expense this month?",
  "How can we reduce spending?",
  "Summarize our group finances",
  "Show recurring expenses breakdown",
  "Who's been paying the most?",
]

/** Extract text content from a UIMessage's parts array */
function getMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map(p => p.text)
    .join("")
}

export function AITab() {
  const { group, getSettlements, getNetBalances, formatAmount } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")

  // Build financial context to send with each request
  const financialContext = useMemo(() => {
    if (!group) return undefined
    const settlements = getSettlements()
    const balances = getNetBalances()
    const memberMap = Object.fromEntries(group.members.map(m => [m.id, m.name]))
    const totalSpentCents = group.transactions.reduce((s, t) => s + t.amount, 0)

    return {
      groupName: group.name,
      currency: group.currency,
      generatedAt: new Date().toISOString(),
      members: group.members.map(m => ({ id: m.id, name: m.name })),
      transactions: group.transactions.map(t => ({
        title: t.title,
        amount: t.amount, // cents
        amountFormatted: formatAmount(t.amount),
        paidByName: memberMap[t.paidByMemberId] || "Unknown",
        dateISO: t.date,
        dateLocal: new Date(t.date).toLocaleDateString(),
        splitBetween: t.splitBetweenMemberIds.map(id => memberMap[id] || "Unknown"),
        splitType: t.splitType,
        isRecurring: t.isRecurring,
        recurrenceFrequency: t.recurrence?.frequency,
        originalCurrency: t.originalCurrency,
        originalAmount: t.originalAmount,
      })),
      settlements: settlements.map(s => ({
        from: memberMap[s.fromMemberId] || "Unknown",
        to: memberMap[s.toMemberId] || "Unknown",
        amountCents: s.amount,
        amountFormatted: formatAmount(s.amount),
      })),
      netBalances: balances.map(b => ({
        name: memberMap[b.memberId] || "Unknown",
        balanceCents: b.balance,
        balanceFormatted: formatAmount(b.balance),
      })),
      totalSpentCents,
      totalSpentFormatted: formatAmount(totalSpentCents),
    }
  }, [group, getSettlements, getNetBalances, formatAmount])

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai-chat",
      prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
        body: {
          id,
          messages: msgs,
          financialContext,
        },
      }),
    }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = (text?: string) => {
    const query = text || inputValue.trim()
    if (!query || isLoading) return
    sendMessage({ text: query })
    setInputValue("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend()
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-12rem)]">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
        {isLoading && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-3 -mx-1 px-1">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 py-8">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Ask about your finances</p>
              <p className="text-xs text-muted-foreground mt-1">
                Powered by AI — I can analyze spending, debts, and give tips
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-2 rounded-xl bg-secondary/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          const text = getMessageText(msg)
          if (!text) return null

          return (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "assistant" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-md"
                    : "glass-card text-foreground rounded-tl-md"
                }`}
              >
                {text}
              </div>
            </div>
          )
        })}

        {/* Streaming indicator */}
        {isLoading && messages.length > 0 && getMessageText(messages[messages.length - 1]) === "" && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-md">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{(error as any)?.message || "Something went wrong. Please try again."}</p>
          </div>
        )}
      </div>

      {/* Suggestions after messages */}
      {messages.length > 0 && !isLoading && (
        <div className="flex flex-wrap gap-1.5 -mt-2">
          {SUGGESTIONS.slice(0, 3).map(s => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="px-2.5 py-1.5 rounded-lg bg-secondary/50 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Ask about your finances..."
          disabled={isLoading}
          className="flex-1 h-12 rounded-xl bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="h-12 w-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shrink-0"
          aria-label="Send message"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  )
}