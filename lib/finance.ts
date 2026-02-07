import type { Transaction, NetBalance, Settlement } from "./types"

export function computeNetBalances(
  transactions: Transaction[],
  memberIds: string[]
): NetBalance[] {
  const balanceMap: Record<string, number> = {}
  for (const id of memberIds) {
    balanceMap[id] = 0
  }

  for (const tx of transactions) {
    const splitCount = tx.splitBetweenMemberIds.length
    if (splitCount === 0) continue
    const sharePerPerson = Math.round(tx.amount / splitCount)

    // Payer gets credited full amount
    if (balanceMap[tx.paidByMemberId] !== undefined) {
      balanceMap[tx.paidByMemberId] += tx.amount
    }

    // Each split member owes their share
    for (const memberId of tx.splitBetweenMemberIds) {
      if (balanceMap[memberId] !== undefined) {
        balanceMap[memberId] -= sharePerPerson
      }
    }
  }

  return memberIds.map((id) => ({
    memberId: id,
    balance: balanceMap[id] || 0,
  }))
}

export function simplifyDebts(balances: NetBalance[]): Settlement[] {
  const creditors: { id: string; amount: number }[] = []
  const debtors: { id: string; amount: number }[] = []

  for (const b of balances) {
    if (b.balance > 0) {
      creditors.push({ id: b.memberId, amount: b.balance })
    } else if (b.balance < 0) {
      debtors.push({ id: b.memberId, amount: -b.balance })
    }
  }

  // Sort descending
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const transferAmount = Math.min(debtors[i].amount, creditors[j].amount)
    if (transferAmount > 0) {
      settlements.push({
        fromMemberId: debtors[i].id,
        toMemberId: creditors[j].id,
        amount: transferAmount,
      })
    }
    debtors[i].amount -= transferAmount
    creditors[j].amount -= transferAmount

    if (debtors[i].amount === 0) i++
    if (creditors[j].amount === 0) j++
  }

  return settlements
}

export function formatCents(cents: number, currency: string): string {
  const currencies: Record<string, { symbol: string; decimals: number }> = {
    USD: { symbol: "$", decimals: 2 },
    EUR: { symbol: "\u20AC", decimals: 2 },
    GBP: { symbol: "\u00A3", decimals: 2 },
    CAD: { symbol: "C$", decimals: 2 },
    AUD: { symbol: "A$", decimals: 2 },
    JPY: { symbol: "\u00A5", decimals: 0 },
    INR: { symbol: "\u20B9", decimals: 2 },
    BRL: { symbol: "R$", decimals: 2 },
  }
  const c = currencies[currency] || { symbol: "$", decimals: 2 }
  if (c.decimals === 0) {
    return `${c.symbol}${Math.round(cents / 100)}`
  }
  return `${c.symbol}${(cents / 100).toFixed(c.decimals)}`
}

export function getTotalSpent(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0)
}

export function getSpendingByPeriod(
  transactions: Transaction[],
  period: "week" | "month"
): number {
  const now = new Date()
  const start = new Date()
  if (period === "week") {
    start.setDate(now.getDate() - 7)
  } else {
    start.setMonth(now.getMonth() - 1)
  }

  return transactions
    .filter((tx) => new Date(tx.date) >= start)
    .reduce((sum, tx) => sum + tx.amount, 0)
}

export function getTopSpender(
  transactions: Transaction[],
  memberIds: string[]
): { memberId: string; amount: number } | null {
  if (transactions.length === 0) return null
  const spendMap: Record<string, number> = {}
  for (const id of memberIds) spendMap[id] = 0
  for (const tx of transactions) {
    if (spendMap[tx.paidByMemberId] !== undefined) {
      spendMap[tx.paidByMemberId] += tx.amount
    }
  }
  let topId = memberIds[0]
  let topAmount = 0
  for (const [id, amount] of Object.entries(spendMap)) {
    if (amount > topAmount) {
      topId = id
      topAmount = amount
    }
  }
  return { memberId: topId, amount: topAmount }
}

export function getSpendingOverTime(
  transactions: Transaction[]
): { date: string; amount: number }[] {
  const map: Record<string, number> = {}
  for (const tx of transactions) {
    const day = tx.date.split("T")[0]
    map[day] = (map[day] || 0) + tx.amount
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }))
}

export function exportTransactionsCSV(
  transactions: Transaction[],
  members: { id: string; name: string }[]
): string {
  const memberMap: Record<string, string> = {}
  for (const m of members) memberMap[m.id] = m.name

  const header = "id,title,amount,date,payer,splitMembers"
  const rows = transactions.map((tx) => {
    const payer = memberMap[tx.paidByMemberId] || tx.paidByMemberId
    const splitNames = tx.splitBetweenMemberIds
      .map((id) => memberMap[id] || id)
      .join(";")
    return `${tx.id},"${tx.title}",${(tx.amount / 100).toFixed(2)},${tx.date},"${payer}","${splitNames}"`
  })
  return [header, ...rows].join("\n")
}

export function exportBalancesCSV(
  balances: NetBalance[],
  members: { id: string; name: string }[]
): string {
  const memberMap: Record<string, string> = {}
  for (const m of members) memberMap[m.id] = m.name

  const header = "member,netBalance"
  const rows = balances.map((b) => {
    const name = memberMap[b.memberId] || b.memberId
    return `"${name}",${(b.balance / 100).toFixed(2)}`
  })
  return [header, ...rows].join("\n")
}
