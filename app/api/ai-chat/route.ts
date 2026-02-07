import {
  consumeStream,
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  const {
    messages,
    financialContext,
  }: {
    messages: UIMessage[]
    financialContext?: {
      groupName: string
      currency: string
      members: { id: string; name: string }[]
      transactions: {
        title: string
        amount: number
        paidByName: string
        date: string
        splitBetween: string[]
        splitType: string
        isRecurring?: boolean
        recurrenceFrequency?: string
        originalCurrency?: string
        originalAmount?: number
      }[]
      settlements: { from: string; to: string; amount: string }[]
      netBalances: { name: string; balance: string }[]
      totalSpent: string
    }
  } = await req.json()

  // Build a rich system prompt with the group's financial data
  let systemPrompt = `You are a helpful financial assistant for a roommate expense-splitting app called "Roomies Ledger". You analyze shared expenses, debts, and give actionable advice.

Be concise, friendly, and specific. Use the financial data below to answer questions accurately. Format currency values clearly. When listing data, use bullet points or numbered lists for readability.

If asked about something outside of finance/the group data, politely redirect to how you can help with their finances.`

  if (financialContext) {
    const { groupName, currency, members, transactions, settlements, netBalances, totalSpent } = financialContext

    systemPrompt += `

## Group: "${groupName}" (${currency})
Members: ${members.map(m => m.name).join(", ")}
Total group spending: ${totalSpent}
Number of expenses: ${transactions.length}

## Net Balances (positive = owed money back, negative = owes money):
${netBalances.map(b => `- ${b.name}: ${b.balance}`).join("\n")}

## Settlements Needed:
${settlements.length === 0 ? "Everyone is settled up!" : settlements.map(s => `- ${s.from} owes ${s.to} ${s.amount}`).join("\n")}

## Recent Transactions (last 20):
${transactions.slice(0, 20).map(t => {
  let line = `- "${t.title}": ${currency} ${(t.amount / 100).toFixed(2)}, paid by ${t.paidByName}, ${t.splitType} split between ${t.splitBetween.join(", ")}, on ${t.date}`
  if (t.isRecurring) line += ` (recurring ${t.recurrenceFrequency})`
  if (t.originalCurrency) line += ` (originally ${t.originalCurrency} ${((t.originalAmount || 0) / 100).toFixed(2)})`
  return line
}).join("\n")}

## Summary Statistics:
${(() => {
  const memberSpending = members.map(m => {
    const total = transactions
      .filter(t => t.paidByName === m.name)
      .reduce((sum, t) => sum + t.amount, 0)
    return `- ${m.name}: paid ${currency} ${(total / 100).toFixed(2)} total`
  })
  return memberSpending.join("\n")
})()}

Recurring expenses: ${transactions.filter(t => t.isRecurring).length} out of ${transactions.length}
`
  }

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
