"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthState {
  user: User | null
  profile: { id: string; display_name: string; email: string; avatar_color: string } | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthState["profile"]>(null)
  const [loading, setLoading] = useState(true)
  const currentUserIdRef = useRef<string | null>(null)

  const supabase = createClient()

  // Fetch profile data
  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, email, avatar_color")
      .eq("id", userId)
      .single()
    if (data) setProfile(data)
  }, [supabase])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        const newId = currentUser?.id ?? null

        // Skip if the user hasn't actually changed (prevents reload on tab focus)
        if (newId === currentUserIdRef.current && event !== "SIGNED_OUT") {
          setLoading(false)
          return
        }

        currentUserIdRef.current = newId
        setUser(currentUser)
        if (currentUser) {
          await fetchProfile(currentUser.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    // Initial session check
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      const newId = u?.id ?? null
      if (newId === currentUserIdRef.current) {
        setLoading(false)
        return
      }
      currentUserIdRef.current = newId
      setUser(u)
      if (u) {
        fetchProfile(u.id)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }, [supabase])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const colors = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"]
    const avatarColor = colors[Math.floor(Math.random() * colors.length)]

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${window.location.origin}/auth/callback`,
        data: {
          display_name: name,
          avatar_color: avatarColor,
        },
      },
    })

    if (error) return { error: error.message, needsConfirmation: false }

    // Check if email confirmation is needed
    const needsConfirmation = !data.session
    return { error: null, needsConfirmation }
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [supabase])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
