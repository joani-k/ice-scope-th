"use client"

import React from "react"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { CURRENCIES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Copy, Share2, Users, Plus, Check, Loader2, Home, ChevronRight } from "lucide-react"

function GroupSelector() {
  const { groups, switchGroup, setGroupGateView, backToMain } = useStore()

  const handleSelectGroup = (groupId: string) => {
    switchGroup(groupId)
    backToMain()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center mb-1">
        <p className="text-sm text-muted-foreground">Choose a household to continue</p>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => handleSelectGroup(g.id)}
            className="flex items-center gap-4 p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/30 hover:border-border/50 transition-all text-left group"
          >
            <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary shrink-0">
              <Home className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground truncate">{g.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {g.members.length} member{g.members.length !== 1 ? "s" : ""} &middot; {g.currency}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </button>
        ))}
      </div>

      <div className="relative flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-border/40" />
        <span className="text-xs text-muted-foreground/60 uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-border/40" />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => setGroupGateView("create")}
          variant="outline"
          className="flex-1 h-11 rounded-xl border-border/50 flex items-center gap-2 text-sm bg-transparent"
        >
          <Plus className="h-4 w-4" /> Create new
        </Button>
        <Button
          onClick={() => setGroupGateView("join")}
          variant="outline"
          className="flex-1 h-11 rounded-xl border-border/50 flex items-center gap-2 text-sm bg-transparent"
        >
          <Users className="h-4 w-4" /> Join group
        </Button>
      </div>
    </div>
  )
}

function ChoiceView() {
  const { setGroupGateView, groups, backToMain } = useStore()
  const hasGroups = groups.length > 0

  return (
    <div className="flex flex-col gap-4">
      {hasGroups && (
        <button
          type="button"
          onClick={() => groups.length > 1 ? setGroupGateView("select") : backToMain()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" /> {groups.length > 1 ? "Back to group picker" : "Back to current group"}
        </button>
      )}
      <Button
        onClick={() => setGroupGateView("create")}
        className="h-14 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-3 transition-all"
      >
        <Plus className="h-5 w-5" /> Create a group
      </Button>
      <Button
        variant="outline"
        onClick={() => setGroupGateView("join")}
        className="h-14 rounded-xl text-base font-semibold border-border/50 flex items-center gap-3 transition-all"
      >
        <Users className="h-5 w-5" /> Join a group
      </Button>
    </div>
  )
}

function CreateGroupForm() {
  const { setGroupGateView, createGroup, groups } = useStore()
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [inviteCode, setInviteCode] = useState("")
  const [creating, setCreating] = useState(false)

  const isValid = name.trim().length > 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    const code = await createGroup(name.trim(), currency)
    setCreating(false)
    if (code) {
      setInviteCode(code)
      setGroupGateView("invite-created")
    }
  }

  if (inviteCode) {
    return <InviteCreated code={inviteCode} />
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setGroupGateView(groups.length > 0 ? "select" : "choice")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="flex flex-col gap-2">
        <Label htmlFor="group-name" className="text-sm font-medium text-muted-foreground">Group name</Label>
        <Input
          id="group-name"
          placeholder="e.g. Apartment 4B"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-12 rounded-xl bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-muted-foreground">Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map(c => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} {c.code} - {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="glass-card p-3 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-primary font-medium">Default split:</span> Equal
      </div>
      <Button
        type="submit"
        disabled={!isValid || creating}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create group"}
      </Button>
    </form>
  )
}

function InviteCreated({ code }: { code: string }) {
  const store = useStore()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEnter = () => {
    store.backToMain()
  }

  return (
    <div className="flex flex-col gap-5 items-center text-center">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
        <Check className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Group created</h2>
      <p className="text-sm text-muted-foreground">Share this invite code with your roommates</p>
      <div className="w-full glass-card p-4 flex items-center justify-center">
        <span className="text-2xl font-mono font-bold text-foreground tracking-[0.3em]">{code}</span>
      </div>
      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          onClick={handleCopy}
          className="flex-1 h-12 rounded-xl border-border/50 flex items-center gap-2 transition-all bg-transparent"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy code"}
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-12 rounded-xl border-border/50 flex items-center gap-2 transition-all bg-transparent"
        >
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </div>
      <Button
        onClick={handleEnter}
        className="w-full h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
      >
        Enter group
      </Button>
    </div>
  )
}

function JoinGroupForm() {
  const { setGroupGateView, joinGroup, groups } = useStore()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [joining, setJoining] = useState(false)

  const isValid = code.trim().length >= 4

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) { setError("Please enter a valid invite code"); return }
    setError("")
    setJoining(true)
    const success = await joinGroup(code.trim())
    setJoining(false)
    if (!success) setError("Invalid invite code. Please try again.")
  }

  return (
    <form onSubmit={handleJoin} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setGroupGateView(groups.length > 0 ? "select" : "choice")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-code" className="text-sm font-medium text-muted-foreground">Invite code</Label>
        <Input
          id="invite-code"
          placeholder="e.g. AB3K92"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          className="h-12 rounded-xl bg-secondary/50 border-border/50 text-foreground font-mono text-center text-lg tracking-[0.2em] uppercase placeholder:text-muted-foreground/50 placeholder:tracking-normal placeholder:font-sans placeholder:text-base"
          maxLength={8}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={!isValid || joining}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : "Join group"}
      </Button>
    </form>
  )
}

export function GroupGate() {
  const { groupGateView, groups } = useStore()

  // Default to "select" view if user has groups, otherwise "choice"
  const effectiveView = groupGateView === "choice" && groups.length > 0 ? "select" : groupGateView

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/3 pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
            R
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance text-center">
            {effectiveView === "select" && "Your households"}
            {effectiveView === "choice" && "Get started"}
            {effectiveView === "create" && "Create a group"}
            {effectiveView === "join" && "Join a group"}
            {effectiveView === "invite-created" && ""}
          </h1>
          {effectiveView === "select" && (
            <p className="text-sm text-muted-foreground text-center">
              {groups.length} household{groups.length !== 1 ? "s" : ""} available
            </p>
          )}
          {effectiveView === "choice" && (
            <p className="text-sm text-muted-foreground text-center">
              Create or join a group to start splitting expenses
            </p>
          )}
        </div>
        <div className="glass-card p-6">
          {effectiveView === "select" && <GroupSelector />}
          {effectiveView === "choice" && <ChoiceView />}
          {effectiveView === "create" && <CreateGroupForm />}
          {effectiveView === "join" && <JoinGroupForm />}
          {effectiveView === "invite-created" && <InviteCreated code="" />}
        </div>
      </div>
    </div>
  )
}
