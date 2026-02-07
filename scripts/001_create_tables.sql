-- ============================================
-- Profiles table (extends auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  avatar_color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#6366f1')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================
-- Groups table
-- ============================================
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'USD',
  invite_code text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

-- Members of a group can see the group
create policy "groups_select_member" on public.groups for select using (
  exists (
    select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid()
  )
);

-- Any authenticated user can insert a group (they become the creator)
create policy "groups_insert_auth" on public.groups for insert with check (auth.uid() = created_by);

-- Only the creator can update the group
create policy "groups_update_creator" on public.groups for update using (auth.uid() = created_by);

-- ============================================
-- Group Members table
-- ============================================
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  avatar_color text not null default '#6366f1',
  -- Permissions
  can_add_transactions boolean not null default true,
  can_edit_transactions boolean not null default false,
  can_delete_transactions boolean not null default false,
  can_manage_debts boolean not null default false,
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

alter table public.group_members enable row level security;

-- Members can see other members of their groups
create policy "gm_select_member" on public.group_members for select using (
  exists (
    select 1 from public.group_members gm2 where gm2.group_id = group_id and gm2.user_id = auth.uid()
  )
);

-- Authenticated users can join groups (insert themselves)
create policy "gm_insert_self" on public.group_members for insert with check (auth.uid() = user_id);

-- Admins can update members in their groups, members can update themselves
create policy "gm_update" on public.group_members for update using (
  auth.uid() = user_id or
  exists (
    select 1 from public.group_members gm2 where gm2.group_id = group_id and gm2.user_id = auth.uid() and gm2.role = 'admin'
  )
);

-- ============================================
-- Transactions table
-- ============================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  amount integer not null, -- in cents, always in group currency
  currency text not null,
  date timestamptz not null default now(),
  place text,
  paid_by_member_id uuid not null references public.group_members(id),
  split_type text not null default 'equal' check (split_type in ('equal', 'exact', 'percentage')),
  split_between_member_ids uuid[] not null default '{}',
  split_amounts jsonb, -- { memberId: cents }
  split_percentages jsonb, -- { memberId: percent }
  is_recurring boolean not null default false,
  recurrence jsonb, -- { frequency: 'daily'|'weekly'|... }
  original_currency text,
  original_amount integer,
  exchange_rate double precision,
  receipt_url text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

-- Group members can read transactions
create policy "tx_select_member" on public.transactions for select using (
  exists (
    select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()
  )
);

-- Group members with add permission can insert transactions
create policy "tx_insert_member" on public.transactions for insert with check (
  auth.uid() = created_by and
  exists (
    select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and gm.can_add_transactions = true
  )
);

-- Group members with delete permission or admins can delete
create policy "tx_delete_member" on public.transactions for delete using (
  exists (
    select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and (gm.can_delete_transactions = true or gm.role = 'admin')
  )
);

-- Group members with edit permission or admins can update
create policy "tx_update_member" on public.transactions for update using (
  exists (
    select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and (gm.can_edit_transactions = true or gm.role = 'admin')
  )
);

-- ============================================
-- Allow groups to be looked up by invite code for joining
-- ============================================
create policy "groups_select_by_invite" on public.groups for select using (true);
