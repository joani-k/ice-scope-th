"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import type {
  User, Group, Transaction, Member, PermissionMap,
  AppScreen, AuthView, GroupGateView, MainTab,
  NetBalance, Settlement,
} from "./types"
import { AVATAR_COLORS } from "./types"

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Demo data
const DEMO_MEMBERS: Member[] = [
  { id: "m1", name: "You", email: "you@example.com", avatarColor: AVATAR_COLORS[0] },
  { id: "m2", name: "Sam", email: "sam@example.com", avatarColor: AVATAR_COLORS[1] },
  { id: "m3", name: "Maya", email: "maya@example.com", avatarColor: AVATAR_COLORS[2] },
  { id: "m4", name: "Alex", email: "alex@example.com", avatarColor: AVATAR_COLORS[3] },
]

const DEMO_PERMISSIONS: PermissionMap = {
  m1: { canAddTransactions: true, canEditTransactions: true, canDeleteTransactions: true, canManageDebts: true, isAdmin: true },
  m2: { canAddTransactions: true, canEditTransactions: true, canDeleteTransactions: false, canManageDebts: false, isAdmin: false },
  m3: { canAddTransactions: true, canEditTransactions: false, canDeleteTransactions: false, canManageDebts: false, isAdmin: false },
  m4: { canAddTransactions: true, canEditTransactions: true, canDeleteTransactions: true, canManageDebts: true, isAdmin: false },
}

const now = new Date()
const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "t1", title: "Groceries - Trader Joe's", amount: 8743, currency: "USD",
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString(),
    paidByMemberId: "m1", splitBetweenMemberIds: ["m1", "m2", "m3", "m4"],
    splitType: "equal", createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString(),
  },
  {
    id: "t2", title: "Electric Bill", amount: 12400, currency: "USD",
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3).toISOString(),
    paidByMemberId: "m2", splitBetweenMemberIds: ["m1", "m2", "m3", "m4"],
    splitType: "equal", isRecurring: true, recurrence: { frequency: "monthly" },
    createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3).toISOString(),
  },
  {
    id: "t3", title: "Pizza Night", amount: 4520, currency: "USD",
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5).toISOString(),
    paidByMemberId: "m3", splitBetweenMemberIds: ["m1", "m2", "m3"],
    splitType: "equal", createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5).toISOString(),
  },
  {
    id: "t4", title: "Netflix Subscription", amount: 1599, currency: "USD",
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString(),
    paidByMemberId: "m1", splitBetweenMemberIds: ["m1", "m2", "m3", "m4"],
    splitType: "equal", isRecurring: true, recurrence: { frequency: "monthly" },
    createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString(),
  },
  {
    id: "t5", title: "Cleaning Supplies", amount: 3250, currency: "USD",
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10).toISOString(),
    paidByMemberId: "m4", splitBetweenMemberIds: ["m1", "m2", "m3", "m4"],
    splitType: "equal", createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10).toISOString(),
  },
  {
    id: "t6", title: "Uber to IKEA", amount: 2800, currency: "USD",
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12).toISOString(),
    paidByMemberId: "m2", splitBetweenMemberIds: ["m2", "m3"],
    splitType: "equal", createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12).toISOString(),
  },
  {
    id: "t7", title: "Internet Bill", amount: 7999, currency: "USD",
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14).toISOString(),
    paidByMemberId: "m1", splitBetweenMemberIds: ["m1", "m2", "m3", "m4"],
    splitType: "equal", isRecurring: true, recurrence: { frequency: "monthly" },
    createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14).toISOString(),
  },
  {
    id: "t8", title: "House Party Snacks", amount: 5600, currency: "USD",
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 16).toISOString(),
    paidByMemberId: "m3", splitBetweenMemberIds: ["m1", "m2", "m3", "m4"],
    splitType: "equal", createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 16).toISOString(),
  },
]

interface StoreState {
  // Auth
  user: User | null
  appScreen: AppScreen
  authView: AuthView
  groupGateView: GroupGateView
  activeTab: MainTab
  // Groups (multi-group)
  groups: Group[]
  activeGroupId: string | null
  group: Group | null // derived from groups + activeGroupId
  currentMemberId: string
  // Actions
  login: (email: string, password: string) => void
  signup: (name: string, email: string, password: string) => void
  logout: () => void
  setAuthView: (v: AuthView) => void
  setGroupGateView: (v: GroupGateView) => void
  setActiveTab: (t: MainTab) => void
  createGroup: (name: string, currency: string) => string
  joinGroup: (code: string) => boolean
  switchGroup: (groupId: string) => void
  goToNewGroup: () => void
  backToMain: () => void
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt" | "currency">) => void
  deleteTransaction: (id: string) => void
  updatePermission: (memberId: string, key: string, value: boolean) => void
  addReceipt: (txId: string, imageUrl: string) => void
  // Computed
  getNetBalances: () => NetBalance[]
  getSettlements: () => Settlement[]
  getCurrencySymbol: () => string
  formatAmount: (cents: number) => string
}

const StoreContext = createContext<StoreState | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appScreen, setAppScreen] = useState<AppScreen>("auth")
  const [authView, setAuthView] = useState<AuthView>("login")
  const [groupGateView, setGroupGateView] = useState<GroupGateView>("choice")
  const [activeTab, setActiveTab] = useState<MainTab>("transactions")
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [currentMemberId, setCurrentMemberId] = useState("m1")
  const [hydrated, setHydrated] = useState(false)

  // Derived: active group
  const group = groups.find(g => g.id === activeGroupId) || null

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem("roomies-ledger-state", JSON.stringify({
      user, appScreen, groups, activeGroupId, currentMemberId, activeTab,
    }))
  }, [user, appScreen, groups, activeGroupId, currentMemberId, activeTab, hydrated])

  const login = useCallback((email: string, _password: string) => {
    const u: User = { id: generateId(), name: email.split("@")[0], email }
    setUser(u)
    setCurrentMemberId("m1")
    setAppScreen("group-gate")
  }, [])

  const signup = useCallback((name: string, email: string, _password: string) => {
    const u: User = { id: generateId(), name, email }
    setUser(u)
    setAppScreen("group-gate")
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setGroups([])
    setActiveGroupId(null)
    setAppScreen("auth")
    setAuthView("login")
    setGroupGateView("choice")
    localStorage.removeItem("roomies-ledger-state")
  }, [])

  const createGroup = useCallback((name: string, currency: string) => {
    const code = generateInviteCode()
    const gId = generateId()
    const me: Member = {
      id: "m1",
      name: user?.name || "You",
      email: user?.email,
      avatarColor: AVATAR_COLORS[0],
    }
    const members = [me, ...DEMO_MEMBERS.slice(1)]
    const permissions: PermissionMap = { ...DEMO_PERMISSIONS }
    const g: Group = {
      id: gId,
      name,
      currency,
      inviteCode: code,
      members,
      permissions,
      transactions: DEMO_TRANSACTIONS.map(t => ({ ...t, currency })),
    }
    setGroups(prev => [...prev, g])
    setActiveGroupId(gId)
    setCurrentMemberId("m1")
    return code
  }, [user])

  const joinGroup = useCallback((_code: string) => {
    // Mock join - just create a demo group
    const gId = generateId()
    const me: Member = {
      id: "m1",
      name: user?.name || "You",
      email: user?.email,
      avatarColor: AVATAR_COLORS[0],
    }
    const members = [me, ...DEMO_MEMBERS.slice(1)]
    const g: Group = {
      id: gId,
      name: "Apartment 4B",
      currency: "USD",
      inviteCode: _code.toUpperCase(),
      members,
      permissions: { ...DEMO_PERMISSIONS },
      transactions: DEMO_TRANSACTIONS.map(t => ({ ...t, currency: "USD" })),
    }
    setGroups(prev => [...prev, g])
    setActiveGroupId(gId)
    setCurrentMemberId("m1")
    setAppScreen("main")
    return true
  }, [user])

  const switchGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId)
    setActiveTab("transactions")
  }, [])

  const goToNewGroup = useCallback(() => {
    setAppScreen("group-gate")
    setGroupGateView("choice")
  }, [])

  const backToMain = useCallback(() => {
    if (groups.length > 0) {
      setAppScreen("main")
    }
  }, [groups])

  const addTransaction = useCallback((tx: Omit<Transaction, "id" | "createdAt" | "currency">) => {
    if (!group) return
    const newTx: Transaction = {
      ...tx,
      id: generateId(),
      currency: group.currency,
      createdAt: new Date().toISOString(),
    }
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, transactions: [newTx, ...g.transactions] } : g))
  }, [group, activeGroupId])

  const deleteTransaction = useCallback((id: string) => {
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, transactions: g.transactions.filter(t => t.id !== id) } : g))
  }, [activeGroupId])

  const updatePermission = useCallback((memberId: string, key: string, value: boolean) => {
    setGroups(prev => prev.map(g => g.id === activeGroupId ? {
      ...g,
      permissions: {
        ...g.permissions,
        [memberId]: {
          ...g.permissions[memberId],
          [key]: value,
        },
      },
    } : g))
  }, [activeGroupId])

  const addReceipt = useCallback((txId: string, imageUrl: string) => {
    setGroups(prev => prev.map(g => g.id === activeGroupId ? {
      ...g,
      transactions: g.transactions.map(t =>
        t.id === txId ? { ...t, receipt: { imageUrl, uploadedAt: new Date().toISOString() } } : t
      ),
    } : g))
  }, [activeGroupId])

  const getNetBalances = useCallback((): NetBalance[] => {
    if (!group) return []
    const balances: Record<string, number> = {}
    group.members.forEach(m => { balances[m.id] = 0 })

    group.transactions.forEach(tx => {
      const splitCount = tx.splitBetweenMemberIds.length
      if (splitCount === 0) return

      // Payer gets credited full amount
      balances[tx.paidByMemberId] = (balances[tx.paidByMemberId] || 0) + tx.amount

      if (tx.splitType === "exact" && tx.splitAmounts) {
        // Each member owes their specific amount
        tx.splitBetweenMemberIds.forEach(memberId => {
          const share = tx.splitAmounts![memberId] || 0
          balances[memberId] = (balances[memberId] || 0) - share
        })
      } else if (tx.splitType === "percentage" && tx.splitPercentages) {
        // Each member owes their percentage of the total
        tx.splitBetweenMemberIds.forEach(memberId => {
          const pct = tx.splitPercentages![memberId] || 0
          const share = Math.round((tx.amount * pct) / 100)
          balances[memberId] = (balances[memberId] || 0) - share
        })
      } else {
        // Equal split
        const sharePerPerson = Math.floor(tx.amount / splitCount)
        const remainder = tx.amount - sharePerPerson * splitCount
        tx.splitBetweenMemberIds.forEach((memberId, i) => {
          const share = sharePerPerson + (i < remainder ? 1 : 0)
          balances[memberId] = (balances[memberId] || 0) - share
        })
      }
    })

    return group.members.map(m => ({
      memberId: m.id,
      balance: balances[m.id] || 0,
    }))
  }, [group])

  const getSettlements = useCallback((): Settlement[] => {
    const balances = getNetBalances()
    const creditors: { id: string; amount: number }[] = []
    const debtors: { id: string; amount: number }[] = []

    balances.forEach(b => {
      if (b.balance > 0) creditors.push({ id: b.memberId, amount: b.balance })
      else if (b.balance < 0) debtors.push({ id: b.memberId, amount: -b.balance })
    })

    creditors.sort((a, b) => b.amount - a.amount)
    debtors.sort((a, b) => b.amount - a.amount)

    const settlements: Settlement[] = []
    let ci = 0
    let di = 0

    while (ci < creditors.length && di < debtors.length) {
      const amount = Math.min(creditors[ci].amount, debtors[di].amount)
      if (amount > 0) {
        settlements.push({
          fromMemberId: debtors[di].id,
          toMemberId: creditors[ci].id,
          amount,
        })
      }
      creditors[ci].amount -= amount
      debtors[di].amount -= amount
      if (creditors[ci].amount === 0) ci++
      if (debtors[di].amount === 0) di++
    }

    return settlements
  }, [getNetBalances])

  const getCurrencySymbol = useCallback(() => {
    if (!group) return "$"
    const symbols: Record<string, string> = {
      USD: "$", EUR: "\u20ac", GBP: "\u00a3", CAD: "C$", AUD: "A$",
      JPY: "\u00a5", INR: "\u20b9", CHF: "CHF",
    }
    return symbols[group.currency] || "$"
  }, [group])

  const formatAmount = useCallback((cents: number) => {
    const sym = getCurrencySymbol()
    const abs = Math.abs(cents)
    const dollars = Math.floor(abs / 100)
    const c = abs % 100
    return `${cents < 0 ? "-" : ""}${sym}${dollars}.${c.toString().padStart(2, "0")}`
  }, [getCurrencySymbol])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("roomies-ledger-state")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.user) setUser(parsed.user)
        if (parsed.appScreen) setAppScreen(parsed.appScreen)
        // Migration: old single-group → new multi-group
        if (parsed.groups) {
          setGroups(parsed.groups)
        } else if (parsed.group) {
          setGroups([parsed.group])
        }
        if (parsed.activeGroupId) setActiveGroupId(parsed.activeGroupId)
        else if (parsed.group?.id) setActiveGroupId(parsed.group.id)
        if (parsed.currentMemberId) setCurrentMemberId(parsed.currentMemberId)
        if (parsed.activeTab) setActiveTab(parsed.activeTab)
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  if (!hydrated) {
    return null
  }

  return (
    <StoreContext.Provider value={{
      user, appScreen, authView, groupGateView, activeTab,
      groups, activeGroupId, group, currentMemberId,
      login, signup, logout,
      setAuthView, setGroupGateView, setActiveTab,
      createGroup, joinGroup, switchGroup, goToNewGroup, backToMain,
      addTransaction, deleteTransaction,
      updatePermission, addReceipt,
      getNetBalances, getSettlements,
      getCurrencySymbol, formatAmount,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}
