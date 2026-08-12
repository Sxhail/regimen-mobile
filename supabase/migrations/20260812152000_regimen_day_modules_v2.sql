-- Keep the shared dashboard default aligned across web and mobile.
alter table public.regimen_user_state
  alter column day_modules set default '["agenda", "next", "inProgress", "goals", "habits", "stats", "principles", "inputs"]'::jsonb;

-- Only replace the exact v2 migration default; preserve every customized layout.
update public.regimen_user_state
set day_modules = '["agenda", "next", "inProgress", "goals", "habits", "stats", "principles", "inputs"]'::jsonb,
    updated_at = now()
where day_modules = '["agenda", "next", "goals", "habits", "stats", "inputs"]'::jsonb;
