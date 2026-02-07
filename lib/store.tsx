"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type {
  User,
  Group,
  Transaction,
  Member,
  PermissionMap,
  AppScreen,
  AuthView,
  GroupGateView,
  MainTab,
  NetBalance,
  Settlement,
} from "./types"
import { AVATAR_COLORS } from "./types"
import { useAuth } from "./auth-provider"
import { createClient } from "@/lib/supabase/client"

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

interface StoreState {
  user: User | null
  appScreen: AppScreen
  authView: AuthView
  groupGateView: GroupGateView
  activeTab: MainTab
  loadingData: boolean

  groups: Group[]
  activeGroupId: string | null
  group: Group | null
  currentMemberId: string

  login: (email: string, password: string) => void
  signup: (name: string, email: string, password: string) => void
  logout: () => Promise<void>
  setAuthView: (v: AuthView) => void
  setGroupGateView: (v: GroupGateView) => void
  setActiveTab: (t: MainTab) => void

  createGroup: (name: string, currency: string) => Promise<string>
  joinGroup: (code: string) => Promise<boolean>
  switchGroup: (groupId: string) => void
  goToNewGroup: () => void
  backToMain: () => void

  addTransaction: (tx: Omit<Transaction, "id" | "createdAt" | "currency">) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  updatePermission: (memberId: string, key: string, value: boolean) => void
  addReceipt: (txId: string, imageUrl: string) => Promise<void>

  getNetBalances: () => NetBalance[]
  getSettlements: () => Settlement[]
  getCurrencySymbol: () => string
  formatAmount: (cents: number) => string
}

const StoreContext = createContext<StoreState | null>(null)

const LS_ACTIVE_GROUP = "roomies-active-group"

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

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

  // If user presses "Create / Join a new household" while already having households
  const [forceGroupGate, setForceGroupGate] = useState(false)

  // Prevent double-load + prevent flicker clearing while auth is resolving
  const loadSeq = useRef(0)

  const group = useMemo(() => groups.find((g) => g.id === activeGroupId) || null, [groups, activeGroupId])

  const user: User | null = authUser
    ? {
        id: authUser.id,
        name: profile?.display_name || authUser.email?.split("@")[0] || "User",
        email: authUser.email || "",
      }
    : null

  const isLoading = authLoading || loadingData

  /* App screen logic:
     - authLoading OR no authUser => auth
     - if logged in:
       - if still loading => auth (prevents group gate flash)
       - else if no groups OR forced => group-gate
       - else main
  */
  const appScreen: AppScreen = useMemo(() => {
    if (authLoading) return "auth"
    if (!authUser) return "auth"
    if (loadingData) return "auth"
    if (forceGroupGate || groups.length === 0 || !activeGroupId) return "group-gate"
    return "main"
  }, [authLoading, authUser, loadingData, forceGroupGate, groups.length, activeGroupId])

  const ensureProfile = useCallback(async () => {
    if (!authUser) return
    if (profile) return
    await supabase
      .from("profiles")
      .upsert(
        {
          id: authUser.id,
          display_name: authUser.email?.split("@")[0] || "User",
          email: authUser.email || "",
          avatar_color: "#6366f1",
        },
        { onConflict: "id" }
      )
  }, [authUser, profile, supabase])

  const loadData = useCallback(async () => {
    if (authLoading) return

    const seq = ++loadSeq.current

    if (!authUser) {
      setGroups([])
      setActiveGroupId(null)
      setCurrentMemberId("")
      setForceGroupGate(false)
      setGroupGateView("choice")
      setLoadingData(false)
      return
    }

    setLoadingData(true)

    try {
      await ensureProfile()

      // 1) memberships
      const { data: memberRows, error: memberErr } = await supabase
        .from("group_members")
        .select("group_id,id,user_id")
        .eq("user_id", authUser.id)

      if (seq !== loadSeq.current) return

      if (memberErr) {
        console.error("Failed to load memberships:", {
          message: (memberErr as any)?.message,
          details: (memberErr as any)?.details,
          hint: (memberErr as any)?.hint,
          code: (memberErr as any)?.code,
        })
        setGroups([])
        setActiveGroupId(null)
        setCurrentMemberId("")
        setGroupGateView("choice")
        setLoadingData(false)
        return
      }

      if (!memberRows || memberRows.length === 0) {
        // NEW USER => show create/join
        setGroups([])
        setActiveGroupId(null)
        setCurrentMemberId("")
        setForceGroupGate(false)
        setGroupGateView("choice")
        setLoadingData(false)
        return
      }

      const groupIds = memberRows.map((r) => r.group_id)

      // 2) groups
      const { data: groupRows, error: groupErr } = await supabase
        .from("groups")
        .select("id,name,currency,invite_code,created_by")
        .in("id", groupIds)

      if (seq !== loadSeq.current) return

      if (groupErr || !groupRows) {
        console.error("Failed to load groups:", groupErr)
        setGroups([])
        setActiveGroupId(null)
        setCurrentMemberId("")
        setGroupGateView("choice")
        setLoadingData(false)
        return
      }

      // 3) members for those groups
      const { data: allMembers, error: memErr } = await supabase
        .from("group_members")
        .select("id,group_id,name,avatar_color,user_id")
        .in("group_id", groupIds)

      if (seq !== loadSeq.current) return
      if (memErr) console.error("Failed to load group members:", memErr)

      // 4) transactions for those groups
      const { data: allTransactions, error: txErr } = await supabase
        .from("transactions")
        .select("*")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })

      if (seq !== loadSeq.current) return
      if (txErr) console.error("Failed to load transactions:", txErr)

      const loadedGroups: Group[] = groupRows.map((g) => {
        const members: Member[] = (allMembers || [])
          .filter((m) => m.group_id === g.id)
          .map((m) => ({
            id: m.id,
            name: m.name ?? "Member",
            email: undefined,
            avatarColor: m.avatar_color || AVATAR_COLORS[0],
          }))

        const permissions: PermissionMap = {}
        members.forEach((m) => {
          const memberRow = (allMembers || []).find((am) => am.id === m.id)
          const isCreator = memberRow?.user_id === g.created_by
          permissions[m.id] = {
            canAddTransactions: true,
            canEditTransactions: !!isCreator,
            canDeleteTransactions: !!isCreator,
            canManageDebts: !!isCreator,
            isAdmin: !!isCreator,
          }
        })

        const transactions: Transaction[] = (allTransactions || [])
          .filter((t) => t.group_id === g.id)
          .map((t) => ({
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
            exchangeRate: t.exchange_rate != null ? Number(t.exchange_rate) : undefined,
            receipt: t.receipt_url
              ? { imageUrl: t.receipt_url, uploadedAt: t.receipt_uploaded_at || t.created_at }
              : undefined,
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

      // Choose active group: localStorage if valid, else first group
      const savedActiveId = typeof window !== "undefined" ? localStorage.getItem(LS_ACTIVE_GROUP) : null
      const savedValid = !!savedActiveId && loadedGroups.some((gg) => gg.id === savedActiveId)

      const chosenGroupId = savedValid ? (savedActiveId as string) : loadedGroups[0]?.id || null
      setActiveGroupId(chosenGroupId)

      const myMember = (allMembers || []).find(
        (m) => m.group_id === chosenGroupId && m.user_id === authUser.id
      )
      setCurrentMemberId(myMember?.id || "")

      // IMPORTANT: user already has households => do NOT show create/join screen
      setForceGroupGate(false)
      setGroupGateView("select")
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      if (seq === loadSeq.current) setLoadingData(false)
    }
  }, [authLoading, authUser, ensureProfile, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (activeGroupId) localStorage.setItem(LS_ACTIVE_GROUP, activeGroupId)
  }, [activeGroupId])

  // Optional: live updates when membership changes (join/create) without refresh
  useEffect(() => {
    if (!authUser) return

    const channel = supabase
      .channel(`roomies-store-${authUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${authUser.id}` },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authUser, loadData, supabase])

  const login = useCallback(() => {}, [])
  const signup = useCallback(() => {}, [])

  const logout = useCallback(async () => {
    await signOut()
    setGroups([])
    setActiveGroupId(null)
    setCurrentMemberId("")
    setGroupGateView("choice")
    setForceGroupGate(false)
    setLoadingData(false)
  }, [signOut])

  const createGroup = useCallback(
    async (name: string, currency: string): Promise<string> => {
      if (!authUser) return ""

      const code = generateInviteCode()
      const groupId = crypto.randomUUID()
      const memberId = crypto.randomUUID()
      const avatarColor = profile?.avatar_color || AVATAR_COLORS[0]
      const displayName = profile?.display_name || authUser.email?.split("@")[0] || "You"

      const { error } = await supabase.rpc("create_group_with_member", {
        p_group_id: groupId,
        p_member_id: memberId,
        p_name: name.trim(),
        p_currency: currency,
        p_member_name: displayName,
        p_avatar_color: avatarColor,
        p_invite_code: code,
      })

      if (error) {
        console.error("Failed to create group:", {
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
        })
        return ""
      }

      const g: Group = {
        id: groupId,
        name: name.trim(),
        currency,
        inviteCode: code,
        members: [{ id: memberId, name: displayName, avatarColor }],
        permissions: {
          [memberId]: {
            canAddTransactions: true,
            canEditTransactions: true,
            canDeleteTransactions: true,
            canManageDebts: true,
            isAdmin: true,
          },
        },
        transactions: [],
      }

      setGroups((prev) => {
        const without = prev.filter((x) => x.id !== g.id)
        return [...without, g]
      })
      setActiveGroupId(groupId)
      setCurrentMemberId(memberId)
      setForceGroupGate(false)
      setGroupGateView("select")
      localStorage.setItem(LS_ACTIVE_GROUP, groupId)
      return code
    },
    [authUser, profile, supabase]
  )

  const joinGroup = useCallback(
    async (code: string): Promise<boolean> => {
      if (!authUser) return false

      const normalizedCode = code.toUpperCase().trim()
      if (!normalizedCode || normalizedCode.length < 4) return false

      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: normalizedCode }),
        })

        const raw = await res.text()
        const data = safeJsonParse<any>(raw) ?? { raw }

        if (!res.ok) {
          console.error("Join group failed:", {
            status: res.status,
            statusText: res.statusText,
            data,
          })
          return false
        }

        const joinedGroup = data?.group
        const newMemberId = data?.currentMemberId
        if (!joinedGroup?.id || !newMemberId) {
          console.error("Join group response missing fields:", data)
          return false
        }

        setGroups((prev) => {
          const without = prev.filter((g) => g.id !== joinedGroup.id)
          return [...without, joinedGroup]
        })
        setActiveGroupId(joinedGroup.id)
        setCurrentMemberId(newMemberId)
        setForceGroupGate(false)
        setGroupGateView("select")
        localStorage.setItem(LS_ACTIVE_GROUP, joinedGroup.id)

        // reload full data to ensure memberId/permissions/tx are correct
        loadData()

        return true
      } catch (err) {
        console.error("Failed to join group:", err)
        return false
      }
    },
    [authUser, loadData]
  )

  const switchGroup = useCallback(
    (groupId: string) => {
      setActiveGroupId(groupId)
      setActiveTab("transactions")
      localStorage.setItem(LS_ACTIVE_GROUP, groupId)

      if (authUser) {
        supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupId)
          .eq("user_id", authUser.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) return
            if (data?.id) setCurrentMemberId(data.id)
          })
      }
    },
    [authUser, supabase]
  )

  // For existing users, this should go to "choice" but not wipe groups.
  const goToNewGroup = useCallback(() => {
    setForceGroupGate(true)
    setGroupGateView("choice")
  }, [])

  const backToMain = useCallback(() => {
    setForceGroupGate(false)
    if (!activeGroupId && groups.length > 0) {
      setActiveGroupId(groups[0].id)
      localStorage.setItem(LS_ACTIVE_GROUP, groups[0].id)
    }
    setGroupGateView("select")
  }, [activeGroupId, groups])

  const addTransaction = useCallback(
    async (tx: Omit<Transaction, "id" | "createdAt" | "currency">) => {
      if (!group || !authUser) return

      const payerId = tx.paidByMemberId || currentMemberId
      if (!payerId) {
        console.error("addTransaction blocked: missing payerId")
        return
      }

      const d = tx.date ? new Date(tx.date) : new Date()
      const dateIso = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()

      const { data, error } = await supabase.rpc("create_transaction", {
        p_group_id: group.id,
        p_title: tx.title,
        p_amount: tx.amount,
        p_paid_by_member_id: payerId,
        p_split_between_member_ids: tx.splitBetweenMemberIds ?? [payerId],
        p_date: dateIso,
        p_place: tx.place ?? null,
        p_split_type: tx.splitType ?? "equal",
        p_split_amounts: tx.splitAmounts ?? null,
        p_split_percentages: tx.splitPercentages ?? null,
        p_is_recurring: tx.isRecurring ?? false,
        p_recurrence: tx.recurrence ?? null,
        p_original_currency: tx.originalCurrency ?? null,
        p_original_amount: tx.originalAmount ?? null,
        p_exchange_rate: tx.exchangeRate ?? null,
        p_receipt_url: tx.receipt?.imageUrl ?? null,
        p_receipt_uploaded_at: tx.receipt?.uploadedAt ?? null,
      })

      const newTx: any = Array.isArray(data) ? data[0] : data

      if (error || !newTx) {
        const e: any = error
        console.error("Failed to add transaction:", {
          message: e?.message,
          details: e?.details,
          hint: e?.hint,
          code: e?.code,
          dataReturned: newTx,
        })
        return
      }

      const localTx: Transaction = {
        id: newTx.id,
        title: newTx.title,
        amount: newTx.amount,
        currency: newTx.currency || group.currency,
        date: newTx.date,
        place: newTx.place || undefined,
        paidByMemberId: newTx.paid_by_member_id,
        splitBetweenMemberIds: newTx.split_between_member_ids || [],
        splitType: newTx.split_type || "equal",
        splitAmounts: newTx.split_amounts || undefined,
        splitPercentages: newTx.split_percentages || undefined,
        isRecurring: newTx.is_recurring || false,
        recurrence: newTx.recurrence || undefined,
        originalCurrency: newTx.original_currency || undefined,
        originalAmount: newTx.original_amount || undefined,
        exchangeRate: newTx.exchange_rate != null ? Number(newTx.exchange_rate) : undefined,
        receipt: newTx.receipt_url
          ? { imageUrl: newTx.receipt_url, uploadedAt: newTx.receipt_uploaded_at || newTx.created_at }
          : undefined,
        createdAt: newTx.created_at,
      }

      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, transactions: [localTx, ...g.transactions] } : g))
      )
    },
    [group, authUser, supabase, currentMemberId]
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!activeGroupId) return

      const { error } = await supabase.from("transactions").delete().eq("id", id)
      if (error) {
        console.error("Failed to delete transaction:", {
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
        })
        return
      }

      setGroups((prev) =>
        prev.map((g) => (g.id === activeGroupId ? { ...g, transactions: g.transactions.filter((t) => t.id !== id) } : g))
      )
    },
    [activeGroupId, supabase]
  )

  const updatePermission = useCallback(
    (memberId: string, key: string, value: boolean) => {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === activeGroupId
            ? {
                ...g,
                permissions: {
                  ...g.permissions,
                  [memberId]: {
                    ...g.permissions[memberId],
                    [key]: value,
                  },
                },
              }
            : g
        )
      )
    },
    [activeGroupId]
  )

  const addReceipt = useCallback(
    async (txId: string, imageUrl: string) => {
      if (!activeGroupId) return

      const uploadedAt = new Date().toISOString()

      const { error } = await supabase
        .from("transactions")
        .update({
          receipt_url: imageUrl,
          receipt_uploaded_at: uploadedAt,
        })
        .eq("id", txId)

      if (error) {
        console.error("Failed to add receipt:", {
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
        })
        return
      }

      setGroups((prev) =>
        prev.map((g) =>
          g.id === activeGroupId
            ? {
                ...g,
                transactions: g.transactions.map((t) =>
                  t.id === txId ? { ...t, receipt: { imageUrl, uploadedAt } } : t
                ),
              }
            : g
        )
      )
    },
    [activeGroupId, supabase]
  )

  const getNetBalances = useCallback((): NetBalance[] => {
    if (!group) return []
    const balances: Record<string, number> = {}
    group.members.forEach((m) => {
      balances[m.id] = 0
    })

    group.transactions.forEach((tx) => {
      const splitCount = tx.splitBetweenMemberIds.length
      if (splitCount === 0) return

      balances[tx.paidByMemberId] = (balances[tx.paidByMemberId] || 0) + tx.amount

      if (tx.splitType === "exact" && tx.splitAmounts) {
        tx.splitBetweenMemberIds.forEach((memberId) => {
          const share = tx.splitAmounts![memberId] || 0
          balances[memberId] = (balances[memberId] || 0) - share
        })
      } else if (tx.splitType === "percentage" && tx.splitPercentages) {
        tx.splitBetweenMemberIds.forEach((memberId) => {
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

    return group.members.map((m) => ({
      memberId: m.id,
      balance: balances[m.id] || 0,
    }))
  }, [group])

  const getSettlements = useCallback((): Settlement[] => {
    const balances = getNetBalances()
    const creditors: { id: string; amount: number }[] = []
    const debtors: { id: string; amount: number }[] = []

    balances.forEach((b) => {
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
      USD: "$",
      EUR: "€",
      GBP: "£",
      CAD: "C$",
      AUD: "A$",
      JPY: "¥",
      INR: "₹",
      CHF: "CHF",
    }
    return symbols[group.currency] || "$"
  }, [group])

  const formatAmount = useCallback(
    (cents: number) => {
      const sym = getCurrencySymbol()
      const abs = Math.abs(cents)
      const dollars = Math.floor(abs / 100)
      const c = abs % 100
      return `${cents < 0 ? "-" : ""}${sym}${dollars}.${c.toString().padStart(2, "0")}`
    },
    [getCurrencySymbol]
  )

  return (
    <StoreContext.Provider
      value={{
        user,
        appScreen,
        authView,
        groupGateView,
        activeTab,
        loadingData: isLoading,

        groups,
        activeGroupId,
        group,
        currentMemberId,

        login,
        signup,
        logout,

        setAuthView,
        setGroupGateView,
        setActiveTab,

        createGroup,
        joinGroup,
        switchGroup,
        goToNewGroup,
        backToMain,

        addTransaction,
        deleteTransaction,
        updatePermission,
        addReceipt,

        getNetBalances,
        getSettlements,
        getCurrencySymbol,
        formatAmount,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used inside StoreProvider")
  return ctx
}
