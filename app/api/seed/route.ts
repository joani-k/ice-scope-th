import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const DEMO_ACCOUNTS = [
  { email: "alice@demo.com", password: "demo1234", name: "Alice", color: "#6366f1" },
  { email: "bob@demo.com", password: "demo1234", name: "Bob", color: "#f59e0b" },
  { email: "charlie@demo.com", password: "demo1234", name: "Charlie", color: "#10b981" },
]

const DEMO_GROUPS = [
  { name: "Downtown Apartment", currency: "USD", code: "DTOWN1" },
  { name: "Beach House", currency: "EUR", code: "BEACH2" },
  { name: "Student Dorm", currency: "USD", code: "DORM33" },
]

export async function POST() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 })
  }

  const supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const userIds: string[] = []

  // Create users
  for (const account of DEMO_ACCOUNTS) {
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === account.email)

    if (existing) {
      userIds.push(existing.id)

      // Ensure profile exists
      await supabaseAdmin.from("profiles").upsert({
        id: existing.id,
        display_name: account.name,
        email: account.email,
        avatar_color: account.color,
      }, { onConflict: "id" })

      continue
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { display_name: account.name, avatar_color: account.color },
    })

    if (error) {
      return NextResponse.json({ error: `Failed to create ${account.email}: ${error.message}` }, { status: 500 })
    }

    userIds.push(data.user.id)

    await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      display_name: account.name,
      email: account.email,
      avatar_color: account.color,
    }, { onConflict: "id" })
  }

  // Create groups - each demo account is a member of ALL 3 groups
  for (const group of DEMO_GROUPS) {
    const { data: existingGroup } = await supabaseAdmin
      .from("groups")
      .select("id")
      .eq("invite_code", group.code)
      .single()

    if (existingGroup) {
      // Ensure all users are members
      for (let i = 0; i < DEMO_ACCOUNTS.length; i++) {
        const userId = userIds[i]
        const account = DEMO_ACCOUNTS[i]

        const { data: existingMember } = await supabaseAdmin
          .from("group_members")
          .select("id")
          .eq("group_id", existingGroup.id)
          .eq("user_id", userId)
          .single()

        if (!existingMember) {
          await supabaseAdmin.from("group_members").insert({
            group_id: existingGroup.id,
            user_id: userId,
            name: account.name,
            avatar_color: account.color,
            is_self: true,
          })
        }
      }
      continue
    }

    // Create group with first user as creator
    const creatorUserId = userIds[0]

    const { data: newGroup, error: groupError } = await supabaseAdmin
      .from("groups")
      .insert({
        name: group.name,
        currency: group.currency,
        invite_code: group.code,
        created_by: creatorUserId,
      })
      .select("id")
      .single()

    if (groupError || !newGroup) {
      return NextResponse.json({ error: `Failed to create group ${group.name}: ${groupError?.message}` }, { status: 500 })
    }

    // Add ALL demo accounts as members
    for (let i = 0; i < DEMO_ACCOUNTS.length; i++) {
      const userId = userIds[i]
      const account = DEMO_ACCOUNTS[i]

      await supabaseAdmin.from("group_members").insert({
        group_id: newGroup.id,
        user_id: userId,
        name: account.name,
        avatar_color: account.color,
        is_self: true,
      })
    }
  }

  return NextResponse.json({
    success: true,
    accounts: DEMO_ACCOUNTS.map(a => ({ email: a.email, name: a.name })),
    groups: DEMO_GROUPS.map(g => ({ name: g.name, code: g.code })),
  })
}
