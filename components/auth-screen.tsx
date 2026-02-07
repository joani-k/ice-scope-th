"use client"

import React from "react"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react"

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function LoginForm() {
  const { login, setAuthView } = useStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const isValid = validateEmail(email) && password.length >= 6

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    setError("")
    login(email, password)
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
        onClick={() => setAuthView("forgot")}
        className="text-sm text-primary hover:underline self-end -mt-2"
      >
        Forgot password?
      </button>
      <Button
        type="submit"
        disabled={!isValid}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        Continue
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {"Don't have an account? "}
        <button type="button" onClick={() => setAuthView("signup")} className="text-primary hover:underline font-medium">
          Sign up
        </button>
      </p>
    </form>
  )
}

function SignupForm() {
  const { signup, setAuthView } = useStore()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const isValid = name.trim().length > 0 && validateEmail(email) && password.length >= 6

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("Name is required"); return }
    if (!validateEmail(email)) { setError("Please enter a valid email address"); return }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return }
    setError("")
    signup(name.trim(), email, password)
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
        disabled={!isValid}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={() => setAuthView("login")} className="text-primary hover:underline font-medium">
          Log in
        </button>
      </p>
    </form>
  )
}

function ForgotPasswordForm() {
  const { setAuthView } = useStore()
  const [email, setEmail] = useState("")
  const isValid = validateEmail(email)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) setAuthView("reset-success")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setAuthView("login")}
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
        />
      </div>
      <Button
        type="submit"
        disabled={!isValid}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        Send reset email
      </Button>
    </form>
  )
}

function ResetSuccess() {
  const { setAuthView } = useStore()
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {"We've sent a password reset link to your email. Follow the instructions to reset your password."}
      </p>
      <Button
        onClick={() => setAuthView("login")}
        className="h-12 w-full rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
      >
        Back to login
      </Button>
    </div>
  )
}

export function AuthScreen() {
  const { authView } = useStore()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/3 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-8">
        {/* Logo / Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
            R
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance text-center">
            {authView === "login" && "Welcome back"}
            {authView === "signup" && "Create your account"}
            {authView === "forgot" && "Reset password"}
            {authView === "reset-success" && ""}
          </h1>
          {authView !== "reset-success" && (
            <p className="text-sm text-muted-foreground text-center">
              {authView === "login" && "Sign in to Roomies Ledger"}
              {authView === "signup" && "Start splitting expenses with roommates"}
              {authView === "forgot" && "Enter your email to receive a reset link"}
            </p>
          )}
        </div>

        {/* Glass card */}
        <div className="glass-card p-6">
          {authView === "login" && <LoginForm />}
          {authView === "signup" && <SignupForm />}
          {authView === "forgot" && <ForgotPasswordForm />}
          {authView === "reset-success" && <ResetSuccess />}
        </div>
      </div>
    </div>
  )
}
