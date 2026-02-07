"use client"

import React from "react"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { CURRENCIES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Copy, Share2, Users, Plus, Check } from "lucide-react"

function ChoiceView() {
  const { setGroupGateView, groups, backToMain } = useStore()
  const hasGroups = groups.length > 0

  return (
    <div className="flex flex-col gap-4">
      {hasGroups && (
        <button
          type="button"
          onClick={backToMain}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" /> Back to current group
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
  const [copied, setCopied] = useState(false)

  const isValid = name.trim().length > 0

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const code = createGroup(name.trim(), currency)
    setInviteCode(code)
    setGroupGateView("invite-created")
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inviteCode) {
    return <InviteCreated code={inviteCode} />
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setGroupGateView("choice")}
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
        disabled={!isValid}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        Create group
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
    // The group was already created in createGroup, just navigate to main
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

  const isValid = code.trim().length >= 4

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) { setError("Please enter a valid invite code"); return }
    const success = joinGroup(code.trim())
    if (!success) setError("Invalid invite code. Please try again.")
  }

  return (
    <form onSubmit={handleJoin} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setGroupGateView("choice")}
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
        disabled={!isValid}
        className="h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all"
      >
        Join group
      </Button>
    </form>
  )
}

export function GroupGate() {
  const { groupGateView, groups } = useStore()
  const isAddingAnother = groups.length > 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/3 pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
            R
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance text-center">
            {groupGateView === "choice" && (isAddingAnother ? "Add another group" : "Get started")}
            {groupGateView === "create" && "Create a group"}
            {groupGateView === "join" && "Join a group"}
            {groupGateView === "invite-created" && ""}
          </h1>
          {groupGateView === "choice" && (
            <p className="text-sm text-muted-foreground text-center">
              {isAddingAnother
                ? `You have ${groups.length} group${groups.length > 1 ? "s" : ""}. Add another below.`
                : "Create or join a group to start splitting expenses"}
            </p>
          )}
        </div>
        <div className="glass-card p-6">
          {groupGateView === "choice" && <ChoiceView />}
          {groupGateView === "create" && <CreateGroupForm />}
          {groupGateView === "join" && <JoinGroupForm />}
          {groupGateView === "invite-created" && <InviteCreated code="" />}
        </div>
      </div>
    </div>
  )
}
