alter table public."Resume" enable row level security;
alter table public."Resume" force row level security;

drop policy if exists "resume_select_own" on public."Resume";
create policy "resume_select_own"
on public."Resume"
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "resume_insert_own" on public."Resume";
create policy "resume_insert_own"
on public."Resume"
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "resume_update_own" on public."Resume";
create policy "resume_update_own"
on public."Resume"
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "resume_delete_own" on public."Resume";
create policy "resume_delete_own"
on public."Resume"
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Temporary DEV policy for debugging only. Do not enable in production.
-- drop policy if exists "resume_dev_all" on public."Resume";
-- create policy "resume_dev_all"
-- on public."Resume"
-- for all
-- to authenticated
-- using (true)
-- with check (true);
