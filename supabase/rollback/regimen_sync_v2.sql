-- Manual compatibility rollback for regimen_sync_v2.
-- Additive columns and indexes intentionally remain: dropping them could lose data.

begin;

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
    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', table_name);
    end if;
  end loop;
end
$$;

-- Restore legacy Data API grants while retaining RLS protection.
do $$
declare
  table_name text;
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
    execute format('grant select, insert, update, delete on table public.%I to anon', table_name);
  end loop;
end
$$;

commit;
