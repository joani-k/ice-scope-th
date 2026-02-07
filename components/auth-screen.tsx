"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Loader2, Users } from "lucide-react"

type AuthView = "login" | "signup" | "forgot" | "reset-success" | "signup-success"

const DEMO_ACCOUNTS = [
  { email: "alice@demo.com", password: "demo1234", name: "Alice", color: "#6366f1", initials: "A" },
  { email: "bob@demo.com", password: "demo1234", name: "Bob", color: "#f59e0b", initials: "B" },
  { email: "charlie@demo.com", password: "demo1234", name: "Charlie", color: "#10b981", initials: "C" },
]

const DEMO_HOUSEHOLDS = [
  { name: "Downtown Apartment", members: ["Alice", "Bob", "Charlie"], code: "DTOWN1" },
  { name: "Beach House", members: ["Alice", "Bob", "Charlie"], code: "BEACH2" },
  { name: "Student Dorm", members: ["Alice", "Bob", "Charlie"], code: "DORM33" },
]

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function DemoAccountsSidebar({ onSelect }: { onSelect: (email: string, password: string) => void }) {
  const [seeded, setSeeded] = useState(false)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    // Auto-seed on first load
    const doSeed = async () => {
      setSeeding(true)
      try {
        await fetch("/api/seed", { method: "POST" })
        setSeeded(true)
      } catch {
        // Ignore errors, user can still use normal login
      }
      setSeeding(false)
    }
    doSeed()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Demo Accounts</h3>
        <p className="text-xs text-muted-foreground">Click to sign in instantly</p>
      </div>

      <div className="flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            onClick={() => onSelect(account.email, account.password)}
            disabled={seeding}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary/80 border border-border/30 transition-all text-left group disabled:opacity-50"
          >
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ backgroundColor: account.color }}
            >
              {account.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
              <p className="text-xs text-muted-foreground truncate">{account.email}</p>
            </div>
          </button>
        ))}
      </div>

      {seeding && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Setting up demo data...
        </div>
      )}

      <div className="border-t border-border/30 pt-4">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Demo Households
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Pre-configured groups</p>
        <div className="flex flex-col gap-2">
          {DEMO_HOUSEHOLDS.map((household) => (
            <div
              key={household.code}
              className="p-3 rounded-xl bg-secondary/30 border border-border/20"
            >
              <p className="text-sm font-medium text-foreground">{household.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {household.members.join(" & ")}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-1 tracking-wider">
                Code: {household.code}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LoginForm({ setView, initialEmail, initialPassword }: { setView: (v: AuthView) => void; initialEmail?: string; initialPassword?: string }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState(initialEmail || "")
  const [password, setPassword] = useState(initialPassword || "")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [autoSubmitting, setAutoSubmitting] = useState(false)

  const isValid = validateEmail(email) && password.length >= 6

  // Auto-submit when demo credentials are pre-filled
  useEffect(() => {
    if (initialEmail && initialPassword && !autoSubmitting) {
      setAutoSubmitting(true)
      const doAutoLogin = async () => {
        setLoading(true)
        const { error: authError } = await signIn(initialEmail, initialPassword)
        setLoading(false)
        if (authError) setError(authError)
        setAutoSubmitting(false)
      }
      doAutoLogin()
    }
  }, [initialEmail, initialPassword, signIn, autoSubmitting])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) { setError("Please enter a valid email address"); return }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return }
    setError("")
    setLoading(true)
    const { error: authError } = await signIn(email, password)
    setLoading(false)
    if (authError) setError(authError)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email" className="text-sm font-medium text-muted-foreground">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-12 rounded-xl bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
          autoComplete="email"
          disabled={loading}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password" className="text-sm font-medium text-muted-foreground">Password</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-12 rounded-xl bg-secondary/50 border-border/50 pr-12 text-foreground placeholder:text-muted-foreground/50"
            autoComplete="current-password"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={() => setView("forgot")}
        className="text-sm text-primary hover:underline self-end -mt-2"
      >
        Forgot password?
      </button>
      <Button
        type="submit"
        disabled={!isValid || loading}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {"Don't have an account? "}
        <button type="button" onClick={() => setView("signup")} className="text-primary hover:underline font-medium">
          Sign up
        </button>
      </p>
    </form>
  )
}

function SignupForm({ setView }: { setView: (v: AuthView) => void }) {
  const { signUp } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const isValid = name.trim().length > 0 && validateEmail(email) && password.length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("Name is required"); return }
    if (!validateEmail(email)) { setError("Please enter a valid email address"); return }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return }
    setError("")
    setLoading(true)
    const { error: authError, needsConfirmation } = await signUp(name.trim(), email, password)
    setLoading(false)
    if (authError) {
      setError(authError)
    } else if (needsConfirmation) {
      setView("signup-success")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-name" className="text-sm font-medium text-muted-foreground">Name</Label>
        <Input
          id="signup-name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-12 rounded-xl bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
          autoComplete="name"
          disabled={loading}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email" className="text-sm font-medium text-muted-foreground">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-12 rounded-xl bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
          autoComplete="email"
          disabled={loading}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password" className="text-sm font-medium text-muted-foreground">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-12 rounded-xl bg-secondary/50 border-border/50 pr-12 text-foreground placeholder:text-muted-foreground/50"
            autoComplete="new-password"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground/70">At least 6 characters</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={!isValid || loading}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={() => setView("login")} className="text-primary hover:underline font-medium">
          Log in
        </button>
      </p>
    </form>
  )
}

function ForgotPasswordForm({ setView }: { setView: (v: AuthView) => void }) {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const isValid = validateEmail(email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    const { error: resetError } = await resetPassword(email)
    setLoading(false)
    if (resetError) setError(resetError)
    else setView("reset-success")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setView("login")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start -mb-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to login
      </button>
      <div className="flex flex-col gap-2">
        <Label htmlFor="forgot-email" className="text-sm font-medium text-muted-foreground">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-12 rounded-xl bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
          autoComplete="email"
          disabled={loading}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={!isValid || loading}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send reset email"}
      </Button>
    </form>
  )
}

function SuccessScreen({ title, message, setView }: { title: string; message: string; setView: (v: AuthView) => void }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
      <Button
        onClick={() => setView("login")}
        className="h-12 w-full rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
      >
        Back to login
      </Button>
    </div>
  )
}

export function AuthScreen() {
  const [view, setView] = useState<AuthView>("login")
  const [demoEmail, setDemoEmail] = useState<string | undefined>()
  const [demoPassword, setDemoPassword] = useState<string | undefined>()

  const handleDemoSelect = (email: string, password: string) => {
    setDemoEmail(email)
    setDemoPassword(password)
    setView("login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/3 pointer-events-none" />

      <div className="relative z-10 flex gap-8 w-full max-w-3xl items-start">
        {/* Demo sidebar - hidden on small screens */}
        <div className="hidden md:block w-64 shrink-0">
          <div className="glass-card p-5 sticky top-8">
            <DemoAccountsSidebar onSelect={handleDemoSelect} />
          </div>
        </div>

        {/* Main auth form */}
        <div className="flex-1 max-w-sm mx-auto md:mx-0 flex flex-col gap-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
              R
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance text-center">
              {view === "login" && "Welcome back"}
              {view === "signup" && "Create your account"}
              {view === "forgot" && "Reset password"}
              {(view === "reset-success" || view === "signup-success") && ""}
            </h1>
            {view !== "reset-success" && view !== "signup-success" && (
              <p className="text-sm text-muted-foreground text-center">
                {view === "login" && "Sign in to Roomies Ledger"}
                {view === "signup" && "Start splitting expenses with roommates"}
                {view === "forgot" && "Enter your email to receive a reset link"}
              </p>
            )}
          </div>

          <div className="glass-card p-6">
            {view === "login" && <LoginForm setView={setView} initialEmail={demoEmail} initialPassword={demoPassword} />}
            {view === "signup" && <SignupForm setView={setView} />}
            {view === "forgot" && <ForgotPasswordForm setView={setView} />}
            {view === "reset-success" && (
              <SuccessScreen
                title="Check your email"
                message="We've sent a password reset link to your email. Follow the instructions to reset your password."
                setView={setView}
              />
            )}
            {view === "signup-success" && (
              <SuccessScreen
                title="Check your email"
                message="We've sent a confirmation link to your email. Please verify your account to get started."
                setView={setView}
              />
            )}
          </div>

          {/* Demo accounts on mobile */}
          <div className="md:hidden">
            <div className="glass-card p-5">
              <DemoAccountsSidebar onSelect={handleDemoSelect} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
