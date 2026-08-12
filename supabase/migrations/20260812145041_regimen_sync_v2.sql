-- Regimen sync v2: additive, mixed-client-safe database expansion.
-- Legacy regimen_items data stays intact for rollback during rollout.

begin;

alter table public.regimen_user_state
  add column if not exists theme_mode text not null default 'system',
  add column if not exists font_style text not null default 'system',
  add column if not exists day_modules jsonb not null default '["agenda", "next", "goals", "habits", "stats", "inputs"]'::jsonb,
  add column if not exists schema_version integer not null default 2,
  add column if not exists sync_revision bigint not null default 0,
  add column if not exists modified_by text;

alter table public.regimen_daily_snapshots
  add column if not exists total_habits integer not null default 0,
  add column if not exists deleted_at timestamptz,
  add column if not exists modified_by text;

alter table public.regimen_daily_history
  add column if not exists deleted_at timestamptz,
  add column if not exists modified_by text;

alter table public.regimen_task_groups add column if not exists modified_by text;
alter table public.regimen_tasks add column if not exists modified_by text;
alter table public.regimen_habits add column if not exists modified_by text;
alter table public.regimen_metrics add column if not exists modified_by text;
alter table public.regimen_goals add column if not exists modified_by text;
alter table public.regimen_principles add column if not exists modified_by text;
alter table public.regimen_calendar_events add column if not exists modified_by text;
alter table public.regimen_calendar_blocks add column if not exists modified_by text;
alter table public.regimen_focus_sessions add column if not exists modified_by text;

-- Backfill the new historical field without changing existing completion data.
update public.regimen_daily_snapshots
set total_habits = greatest(total_habits, completed_habits)
where total_habits < completed_habits;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.regimen_user_state'::regclass
      and conname = 'regimen_user_state_theme_mode_check'
  ) then
    alter table public.regimen_user_state
      add constraint regimen_user_state_theme_mode_check
      check (theme_mode in ('light', 'dark', 'system'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.regimen_user_state'::regclass
      and conname = 'regimen_user_state_font_style_check'
  ) then
    alter table public.regimen_user_state
      add constraint regimen_user_state_font_style_check
      check (font_style in ('system', 'inter', 'lora', 'mono'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.regimen_daily_snapshots'::regclass
      and conname = 'regimen_daily_snapshots_total_habits_check'
  ) then
    alter table public.regimen_daily_snapshots
      add constraint regimen_daily_snapshots_total_habits_check
      check (total_habits >= 0);
  end if;
end
$$;

create index if not exists regimen_user_state_user_updated_idx
  on public.regimen_user_state (user_id, updated_at desc);
create index if not exists regimen_task_groups_user_updated_idx
  on public.regimen_task_groups (user_id, updated_at desc);
create index if not exists regimen_tasks_user_updated_idx
  on public.regimen_tasks (user_id, updated_at desc);
create index if not exists regimen_habits_user_updated_idx
  on public.regimen_habits (user_id, updated_at desc);
create index if not exists regimen_metrics_user_updated_idx
  on public.regimen_metrics (user_id, updated_at desc);
create index if not exists regimen_goals_user_updated_idx
  on public.regimen_goals (user_id, updated_at desc);
create index if not exists regimen_principles_user_updated_idx
  on public.regimen_principles (user_id, updated_at desc);
create index if not exists regimen_calendar_events_user_updated_idx
  on public.regimen_calendar_events (user_id, updated_at desc);
create index if not exists regimen_calendar_blocks_user_updated_idx
  on public.regimen_calendar_blocks (user_id, updated_at desc);
create index if not exists regimen_focus_sessions_user_updated_idx
  on public.regimen_focus_sessions (user_id, updated_at desc);
create index if not exists regimen_daily_snapshots_user_updated_idx
  on public.regimen_daily_snapshots (user_id, updated_at desc);
create index if not exists regimen_daily_history_user_updated_idx
  on public.regimen_daily_history (user_id, updated_at desc);

-- Replace duplicated/public-target policies with one owner policy per operation.
do $$
declare
  table_name text;
  policy record;
begin
  foreach table_name in array array[
    'regimen_items',
    'regimen_user_state',
    'regimen_task_groups',
    'regimen_tasks',
    'regimen_habits',
    'regimen_metrics',
    'regimen_goals',
    'regimen_principles',
    'regimen_calendar_events',
    'regimen_calendar_blocks',
    'regimen_focus_sessions',
    'regimen_daily_snapshots',
    'regimen_daily_history'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);

    for policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy %I on public.%I', policy.policyname, table_name);
    end loop;

    execute format(
      'create policy sync_select_own on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'create policy sync_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'create policy sync_update_own on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'create policy sync_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name
    );

    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
  end loop;
end
$$;

-- Publish canonical row tables. regimen_items remains rollback-only.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'regimen_user_state',
    'regimen_task_groups',
    'regimen_tasks',
    'regimen_habits',
    'regimen_metrics',
    'regimen_goals',
    'regimen_principles',
    'regimen_calendar_events',
    'regimen_calendar_blocks',
    'regimen_focus_sessions',
    'regimen_daily_snapshots',
    'regimen_daily_history'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;

commit;
