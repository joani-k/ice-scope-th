import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authenticated user
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const code = (body?.code || "").toUpperCase().trim()

    if (!code || code.length < 4) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 400 }
      )
    }

    // Find the group by invite code
    const { data: group, error: groupErr } = await supabase
      .from("groups")
      .select("id,name,currency,invite_code,created_by")
      .eq("invite_code", code)
      .maybeSingle()

    if (groupErr || !group) {
      return NextResponse.json(
        { error: "No group found with that invite code" },
        { status: 404 }
      )
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle()

    let currentMemberId: string

    if (existingMember) {
      currentMemberId = existingMember.id
    } else {
      // Get profile for display name and avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name,avatar_color")
        .eq("id", user.id)
        .maybeSingle()

      const displayName =
        profile?.display_name || user.email?.split("@")[0] || "User"
      const avatarColor = profile?.avatar_color || "#6366f1"

      // Insert new member
      const { data: newMember, error: insertErr } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          name: displayName,
          avatar_color: avatarColor,
          is_self: true,
        })
        .select("id")
        .single()

      if (insertErr || !newMember) {
        console.error("Failed to insert member:", insertErr)
        return NextResponse.json(
          { error: "Failed to join group" },
          { status: 500 }
        )
      }

      currentMemberId = newMember.id
    }

    // Load full group data (members + transactions)
    const { data: members } = await supabase
      .from("group_members")
      .select("id,name,avatar_color,user_id,group_id")
      .eq("group_id", group.id)

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("group_id", group.id)
      .order("date", { ascending: false })

    const memberList = (members || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      avatarColor: m.avatar_color,
    }))

    const permissions: Record<string, any> = {}
    for (const m of members || []) {
      permissions[m.id] = {
        canAddTransactions: true,
        canEditTransactions: m.user_id === group.created_by,
        canDeleteTransactions: m.user_id === group.created_by,
        canManageDebts: true,
        isAdmin: m.user_id === group.created_by,
      }
    }

    const txList = (transactions || []).map((t: any) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      currency: t.currency,
      paidBy: t.paid_by_member_id,
      splitBetween: t.split_between || [],
      category: t.category || "other",
      date: t.date,
      createdAt: t.created_at,
    }))

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        currency: group.currency,
        inviteCode: group.invite_code,
        members: memberList,
        permissions,
        transactions: txList,
      },
      currentMemberId,
    })
  } catch (err) {
    console.error("Join group error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
