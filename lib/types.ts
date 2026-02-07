export interface User {
  id: string
  name: string
  email: string
}

export interface Member {
  id: string
  name: string
  email?: string
  avatarColor: string
}

export interface Transaction {
  id: string
  title: string
  amount: number // stored in cents, always in group's default currency
  currency: string // group's default currency
  date: string // ISO string
  place?: string // optional location/place
  /** Original currency if different from group currency */
  originalCurrency?: string
  /** Original amount in cents in the original currency */
  originalAmount?: number
  /** Exchange rate used: 1 originalCurrency = exchangeRate groupCurrency */
  exchangeRate?: number
  paidByMemberId: string
  splitBetweenMemberIds: string[]
  splitType: "equal" | "exact" | "percentage"
  /** Per-member amounts in cents – used when splitType is "exact" */
  splitAmounts?: Record<string, number>
  /** Per-member percentages (0-100) – used when splitType is "percentage" */
  splitPercentages?: Record<string, number>
  isRecurring?: boolean
  recurrence?: {
    frequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly"
  }
  receipt?: {
    imageUrl: string
    uploadedAt: string
  }
  createdAt: string
}

export interface PermissionMap {
  [memberId: string]: {
    canAddTransactions: boolean
    canEditTransactions: boolean
    canDeleteTransactions: boolean
    canManageDebts: boolean
    isAdmin: boolean
  }
}

export interface Group {
  id: string
  name: string
  currency: string
  inviteCode: string
  members: Member[]
  permissions: PermissionMap
  transactions: Transaction[]
}

export interface Settlement {
  fromMemberId: string
  toMemberId: string
  amount: number // in cents
}

export interface NetBalance {
  memberId: string
  balance: number // positive = owed, negative = owes
}

export type AppScreen = "auth" | "group-gate" | "main"
export type AuthView = "login" | "signup" | "forgot" | "reset-success"
export type GroupGateView = "choice" | "create" | "join" | "invite-created"
export type MainTab = "transactions" | "calendar" | "debts" | "people" | "permissions" | "highlights" | "ai" | "account"

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "\u20ac", name: "Euro" },
  { code: "GBP", symbol: "\u00a3", name: "British Pound" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "\u00a5", name: "Japanese Yen" },
  { code: "INR", symbol: "\u20b9", name: "Indian Rupee" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "\u00a5", name: "Chinese Yuan" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "KRW", symbol: "\u20a9", name: "South Korean Won" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "PLN", symbol: "z\u0142", name: "Polish Zloty" },
  { code: "THB", symbol: "\u0e3f", name: "Thai Baht" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "TRY", symbol: "\u20ba", name: "Turkish Lira" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "PHP", symbol: "\u20b1", name: "Philippine Peso" },
  { code: "COP", symbol: "COL$", name: "Colombian Peso" },
  { code: "EGP", symbol: "E\u00a3", name: "Egyptian Pound" },
] as const

/** Helper to look up currency symbol */
export function getCurrencySymbolByCode(code: string): string {
  const found = CURRENCIES.find(c => c.code === code)
  return found?.symbol || code
}

export const AVATAR_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
]
