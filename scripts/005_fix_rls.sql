-- Fix: Let group creators always see their own groups (breaks circular dependency)
CREATE POLICY "groups_select_creator" ON public.groups FOR SELECT USING (created_by = auth.uid());

-- Fix: Replace self-referential members_select with direct check
DROP POLICY IF EXISTS "members_select" ON public.group_members;
CREATE POLICY "members_select" ON public.group_members FOR SELECT
  USING (user_id = auth.uid() OR group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid()));
