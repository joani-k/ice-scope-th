"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import type {
  User, Group, Transaction, Member, PermissionMap,
  AppScreen, AuthView, GroupGateView, MainTab,
  NetBalance, Settlement,
} from "./types"
import { AVATAR_COLORS } from "./types"
import { useAuth } from "./auth-provider"
import { createClient } from "@/lib/supabase/client"

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

interface StoreState {
  // Auth
  user: User | null
  appScreen: AppScreen
  authView: AuthView
  groupGateView: GroupGateView
  activeTab: MainTab
  loadingData: boolean
  // Groups (multi-group)
  groups: Group[]
  activeGroupId: string | null
  group: Group | null
  currentMemberId: string
  // Actions
  login: (email: string, password: string) => void
  signup: (name: string, email: string, password: string) => void
  logout: () => void
  setAuthView: (v: AuthView) => void
  setGroupGateView: (v: GroupGateView) => void
  setActiveTab: (t: MainTab) => void
  createGroup: (name: string, currency: string) => Promise<string>
  joinGroup: (code: string) => Promise<boolean>
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
  const { user: authUser, profile, loading: authLoading, signOut } = useAuth()
  const supabase = createClient()

  const [authView, setAuthView] = useState<AuthView>("login")
  const [groupGateView, setGroupGateView] = useState<GroupGateView>("choice")
  const [activeTab, setActiveTab] = useState<MainTab>("transactions")
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [currentMemberId, setCurrentMemberId] = useState("")
  const [loadingData, setLoadingData] = useState(true)
  const [forceGroupGate, setForceGroupGate] = useState(false)

  // Derived
  const group = groups.find(g => g.id === activeGroupId) || null

  // Map auth user to app User type (works even if profile is null)
  const user: User | null = authUser ? {
    id: authUser.id,
    name: profile?.display_name || authUser.email?.split("@")[0] || "User",
    email: authUser.email || "",
  } : null

  // Combine auth loading + data loading into one flag
  const isLoading = authLoading || loadingData

  // Derived app screen
  const appScreen: AppScreen = (() => {
    if (!authUser && !authLoading) return "auth"
    if (!isLoading && (groups.length === 0 || forceGroupGate || !activeGroupId)) return "group-gate"
    if (!isLoading) return "main"
    return "auth" // fallback during loading
  })()

  // ─── Load groups + members + transactions from Supabase ───
  const loadData = useCallback(async () => {
    if (!authUser) {
      setGroups([])
      setActiveGroupId(null)
      setLoadingData(false)
      return
    }

    setLoadingData(true)
    try {
      // Ensure profile exists (fallback if trigger didn't fire)
      if (!profile) {
        await supabase.from("profiles").upsert({
          id: authUser.id,
          display_name: authUser.email?.split("@")[0] || "User",
          email: authUser.email || "",
          avatar_color: "#6366f1",
        }, { onConflict: "id" })
      }

      // Fetch groups the user belongs to
      const { data: memberRows, error: memberErr } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", authUser.id)

      if (memberErr || !memberRows || memberRows.length === 0) {
        setGroups([])
        setActiveGroupId(null)
        setLoadingData(false)
        return
      }

      const groupIds = memberRows.map(r => r.group_id)

      // Fetch all groups
      const { data: groupRows } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)

      if (!groupRows) {
        setGroups([])
        setLoadingData(false)
        return
      }

      // Fetch all members for these groups
      const { data: allMembers } = await supabase
        .from("group_members")
        .select("*")
        .in("group_id", groupIds)

      // Fetch all transactions for these groups
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("*")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })

      const loadedGroups: Group[] = groupRows.map(g => {
        const members: Member[] = (allMembers || [])
          .filter(m => m.group_id === g.id)
          .map(m => ({
            id: m.id,
            name: m.name,
            email: undefined,
            avatarColor: m.avatar_color || AVATAR_COLORS[0],
          }))

        // Build permissions - creator is admin, everyone else has basic permissions
        const permissions: PermissionMap = {}
        members.forEach(m => {
          const memberRow = (allMembers || []).find(am => am.id === m.id)
          const isCreator = memberRow?.user_id === g.created_by
          permissions[m.id] = {
            canAddTransactions: true,
            canEditTransactions: isCreator,
            canDeleteTransactions: isCreator,
            canManageDebts: isCreator,
            isAdmin: isCreator,
          }
        })

        const transactions: Transaction[] = (allTransactions || [])
          .filter(t => t.group_id === g.id)
          .map(t => ({
            id: t.id,
            title: t.title,
            amount: t.amount,
            currency: t.currency || g.currency,
            date: t.date,
            place: t.place || undefined,
            paidByMemberId: t.paid_by_member_id,
            splitBetweenMemberIds: t.split_between_member_ids || [],
            splitType: t.split_type || "equal",
            splitAmounts: t.split_amounts || undefined,
            splitPercentages: t.split_percentages || undefined,
            isRecurring: t.is_recurring || false,
            recurrence: t.recurrence || undefined,
            originalCurrency: t.original_currency || undefined,
            originalAmount: t.original_amount || undefined,
            exchangeRate: t.exchange_rate ? Number(t.exchange_rate) : undefined,
            receipt: t.receipt_url ? { imageUrl: t.receipt_url, uploadedAt: t.receipt_uploaded_at || t.created_at } : undefined,
            createdAt: t.created_at,
          }))

        return {
          id: g.id,
          name: g.name,
          currency: g.currency,
          inviteCode: g.invite_code || "------",
          members,
          permissions,
          transactions,
        }
      })

      setGroups(loadedGroups)

      // Set active group and current member
      if (loadedGroups.length > 0) {
        const savedActiveId = localStorage.getItem("roomies-active-group")
        const hasSavedGroup = savedActiveId && loadedGroups.find(g => g.id === savedActiveId)

        if (hasSavedGroup) {
          // Returning user with a saved preference - auto-select
          setActiveGroupId(savedActiveId)
          const myMember = (allMembers || []).find(
            m => m.group_id === savedActiveId && m.user_id === authUser.id
          )
          if (myMember) setCurrentMemberId(myMember.id)
        } else if (loadedGroups.length === 1) {
          // Only one group - auto-select it
          setActiveGroupId(loadedGroups[0].id)
          const myMember = (allMembers || []).find(
            m => m.group_id === loadedGroups[0].id && m.user_id === authUser.id
          )
          if (myMember) setCurrentMemberId(myMember.id)
        } else {
          // Multiple groups, no saved preference - show group picker
          setActiveGroupId(null)
          setGroupGateView("select")
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err)
    }
    setLoadingData(false)
  }, [authUser, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save active group preference
  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem("roomies-active-group", activeGroupId)
    }
  }, [activeGroupId])

  // ─── Auth actions (delegated to AuthProvider, kept for interface compatibility) ───
  const login = useCallback(() => {}, [])
  const signup = useCallback(() => {}, [])
  const logout = useCallback(async () => {
    await signOut()
    setGroups([])
    setActiveGroupId(null)
    setGroupGateView("choice")
  }, [signOut])

  // ─── Group actions ───
  const createGroup = useCallback(async (name: string, currency: string): Promise<string> => {
    if (!authUser) return ""

    const code = generateInviteCode()
    const groupId = crypto.randomUUID()
    const memberId = crypto.randomUUID()
    const avatarColor = profile?.avatar_color || AVATAR_COLORS[0]
    const displayName = profile?.display_name || authUser.email?.split("@")[0] || "You"

    const { error } = await supabase.rpc("create_group_with_member", {
      p_group_id: groupId,
      p_member_id: memberId,
      p_name: name,
      p_currency: currency,
      p_member_name: displayName,
      p_avatar_color: avatarColor,
      p_invite_code: code,
    })

    if (error) {
      console.error("Failed to create group:", error)
      return ""
    }

    const newMember = { id: memberId }
    const newGroup = { id: groupId }

    // Build local group object
    const g: Group = {
      id: newGroup.id,
      name,
      currency,
      inviteCode: code,
      members: [{
        id: newMember.id,
        name: displayName,
        avatarColor,
      }],
      permissions: {
        [newMember.id]: {
          canAddTransactions: true,
          canEditTransactions: true,
          canDeleteTransactions: true,
          canManageDebts: true,
          isAdmin: true,
        },
      },
      transactions: [],
    }

    setGroups(prev => [...prev, g])
    setActiveGroupId(newGroup.id)
    setCurrentMemberId(newMember.id)
    setForceGroupGate(false)
    return code
  }, [authUser, profile, supabase])

  const joinGroup = useCallback(async (code: string): Promise<boolean> => {
    if (!authUser) return false

    const avatarColor = profile?.avatar_color || AVATAR_COLORS[0]
    const displayName = profile?.display_name || authUser.email?.split("@")[0] || "You"

    const { data: groupId, error } = await supabase.rpc("join_group_by_code", {
      p_invite_code: code.toUpperCase().trim(),
      p_member_name: displayName,
      p_avatar_color: avatarColor,
    })

    if (error || !groupId) {
      console.error("Failed to join group:", error)
      return false
    }

    // Reload all data to get the full group info
    await loadData()
    setActiveGroupId(groupId)
    setForceGroupGate(false)
    return true
  }, [authUser, profile, supabase, loadData])

  const switchGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId)
    setActiveTab("transactions")

    // Update current member ID for this group
    if (authUser) {
      supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", authUser.id)
        .single()
        .then(({ data }) => {
          if (data) setCurrentMemberId(data.id)
        })
    }
  }, [authUser, supabase])

  const goToNewGroup = useCallback(() => {
    setGroupGateView("choice")
    setForceGroupGate(true)
  }, [])

  const backToMain = useCallback(() => {
    setForceGroupGate(false)
    // If we came from the selector but haven't picked a group, pick the first one
    if (!activeGroupId && groups.length > 0) {
      setActiveGroupId(groups[0].id)
    }
  }, [activeGroupId, groups])

  // ─── Transaction actions ───
  const addTransaction = useCallback(async (tx: Omit<Transaction, "id" | "createdAt" | "currency">) => {
    if (!group || !authUser) return

    const { data: newTx, error } = await supabase
      .from("transactions")
      .insert({
        group_id: group.id,
        title: tx.title,
        amount: tx.amount,
        currency: group.currency,
        date: tx.date,
        place: tx.place || null,
        paid_by_member_id: tx.paidByMemberId,
        split_type: tx.splitType || "equal",
        split_between_member_ids: tx.splitBetweenMemberIds,
        split_amounts: tx.splitAmounts || null,
        split_percentages: tx.splitPercentages || null,
        is_recurring: tx.isRecurring || false,
        recurrence: tx.recurrence || null,
        original_currency: tx.originalCurrency || null,
        original_amount: tx.originalAmount || null,
        exchange_rate: tx.exchangeRate || null,
        receipt_url: tx.receipt?.imageUrl || null,
        receipt_uploaded_at: tx.receipt?.uploadedAt || null,
        created_by: authUser.id,
      })
      .select()
      .single()

    if (error || !newTx) {
      console.error("Failed to add transaction:", error)
      return
    }

    // Add to local state
    const localTx: Transaction = {
      ...tx,
      id: newTx.id,
      currency: group.currency,
      createdAt: newTx.created_at,
    }
    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, transactions: [localTx, ...g.transactions] } : g))
  }, [group, authUser, supabase])

  const deleteTransaction = useCallback(async (id: string) => {
    if (!activeGroupId) return

    const { error } = await supabase.from("transactions").delete().eq("id", id)
    if (error) {
      console.error("Failed to delete transaction:", error)
      return
    }

    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, transactions: g.transactions.filter(t => t.id !== id) } : g))
  }, [activeGroupId, supabase])

  const updatePermission = useCallback((memberId: string, key: string, value: boolean) => {
    // Permissions are managed locally for now
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

  const addReceipt = useCallback(async (txId: string, imageUrl: string) => {
    if (!activeGroupId) return

    await supabase.from("transactions").update({
      receipt_url: imageUrl,
      receipt_uploaded_at: new Date().toISOString(),
    }).eq("id", txId)

    setGroups(prev => prev.map(g => g.id === activeGroupId ? {
      ...g,
      transactions: g.transactions.map(t =>
        t.id === txId ? { ...t, receipt: { imageUrl, uploadedAt: new Date().toISOString() } } : t
      ),
    } : g))
  }, [activeGroupId, supabase])

  // ─── Computed (unchanged) ───
  const getNetBalances = useCallback((): NetBalance[] => {
    if (!group) return []
    const balances: Record<string, number> = {}
    group.members.forEach(m => { balances[m.id] = 0 })

    group.transactions.forEach(tx => {
      const splitCount = tx.splitBetweenMemberIds.length
      if (splitCount === 0) return

      balances[tx.paidByMemberId] = (balances[tx.paidByMemberId] || 0) + tx.amount

      if (tx.splitType === "exact" && tx.splitAmounts) {
        tx.splitBetweenMemberIds.forEach(memberId => {
          const share = tx.splitAmounts![memberId] || 0
          balances[memberId] = (balances[memberId] || 0) - share
        })
      } else if (tx.splitType === "percentage" && tx.splitPercentages) {
        tx.splitBetweenMemberIds.forEach(memberId => {
          const pct = tx.splitPercentages![memberId] || 0
          const share = Math.round((tx.amount * pct) / 100)
          balances[memberId] = (balances[memberId] || 0) - share
        })
      } else {
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

  return (
    <StoreContext.Provider value={{
      user, appScreen, authView, groupGateView, activeTab, loadingData: isLoading,
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
